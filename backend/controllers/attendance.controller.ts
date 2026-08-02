import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { HIDDEN_ROLES } from '../lib/constants.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const parseCoordinate = (value: unknown, min: number, max: number) => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

const parsePhoto = (photo: unknown) => {
  if (typeof photo !== 'string') return null;
  const matches = photo.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!matches) return null;
  const buffer = Buffer.from(matches[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) return null;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if ((matches[1] === 'jpeg' && !jpeg) || (matches[1] === 'png' && !png)) return null;
  return { buffer, extension: matches[1] === 'png' ? 'png' : 'jpg' };
};

const saveImage = (image: { buffer: Buffer; extension: string }) => {
  const filename = `${uuidv4()}.${image.extension}`;
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, image.buffer);
  return { filepath, url: `/uploads/${filename}` };
};

const findAttendanceEmployee = async (req: AuthRequest, res: Response) => {
  const employee = await prisma.employee.findFirst({
    where: { userId: req.user.id, deletedAt: null, status: 'ACTIVE' },
    include: { shift: true, outlet: true }
  });
  if (!employee) {
    res.status(403).json({ message: 'Profil karyawan aktif tidak ditemukan. Hubungi administrator jika Anda seharusnya memiliki akses absensi.' });
    return null;
  }
  return employee;
};

const checkLocationForEmployee = async (employeeId: string, latitude: number, longitude: number) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // 1. Check if employee has a WorkSchedule with an assigned Outlet for today
  const todaySchedule = await prisma.workSchedule.findFirst({
    where: {
      employeeId,
      date: { gte: todayStart, lte: todayEnd },
      deletedAt: null
    },
    include: { outlet: true }
  });

  let targetOutlet = todaySchedule?.outlet;

  // 2. If no WorkSchedule outlet, check employee's primary outlet
  if (!targetOutlet) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { outlet: true }
    });
    targetOutlet = employee?.outlet || null;
  }

  // 3. Fallback to active outlet or LocationSetting
  if (!targetOutlet) {
    targetOutlet = await prisma.outlet.findFirst({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  if (!targetOutlet) {
    const setting = await prisma.locationSetting.findFirst({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } });
    if (!setting) return null;
    const distance = getDistanceFromLatLonInM(latitude, longitude, Number(setting.latitude), Number(setting.longitude));
    return {
      outlet: null,
      settingName: setting.name,
      inRadius: distance <= Number(setting.radius),
      distanceMeters: Math.round(distance),
      radiusMeters: Number(setting.radius),
      latitude: setting.latitude,
      longitude: setting.longitude
    };
  }

  const distance = getDistanceFromLatLonInM(latitude, longitude, Number(targetOutlet.latitude), Number(targetOutlet.longitude));
  return {
    outlet: targetOutlet,
    settingName: targetOutlet.name,
    inRadius: distance <= Number(targetOutlet.radius),
    distanceMeters: Math.round(distance),
    radiusMeters: Number(targetOutlet.radius),
    latitude: targetOutlet.latitude,
    longitude: targetOutlet.longitude
  };
};

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await findAttendanceEmployee(req, res);
    if (!employee) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        clockOut: null,
        deletedAt: null
      },
      include: { outlet: true },
      orderBy: { date: 'desc' }
    });

    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: todayStart, lte: todayEnd },
        deletedAt: null
      },
      include: { outlet: true },
      orderBy: { createdAt: 'desc' }
    });

    const todayShiftAssignment = await prisma.workSchedule.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: todayStart, lte: todayEnd },
        deletedAt: null
      },
      include: { shift: true, outlet: true }
    });

    const recentLogs = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        deletedAt: null
      },
      include: { outlet: true },
      orderBy: { date: 'desc' },
      take: 10
    });

    const activeOutlet = todayShiftAssignment?.outlet || employee.outlet || await prisma.outlet.findFirst({ where: { deletedAt: null, isActive: true } });

    res.json({ 
      isCheckedIn: !!activeAttendance, 
      attendance: activeAttendance || todayAttendance,
      todayAttendance,
      shift: todayShiftAssignment?.shift || employee.shift || null,
      outlet: activeOutlet || null,
      recentLogs,
      canClockIn: !activeAttendance && !todayAttendance?.clockOut,
      canClockOut: !!activeAttendance,
      locationConfigured: !!activeOutlet,
      location: activeOutlet ? {
        name: activeOutlet.name,
        code: activeOutlet.code,
        latitude: activeOutlet.latitude,
        longitude: activeOutlet.longitude,
        radiusMeters: activeOutlet.radius
      } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memuat status absensi.' });
  }
};

export const getMyAttendances = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await findAttendanceEmployee(req, res);
    if (!employee) return;

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        deletedAt: null
      },
      include: { outlet: true },
      orderBy: { date: 'desc' },
      take: 50
    });

    res.json(attendances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memuat riwayat presensi.' });
  }
};

export const checkAttendanceLocation = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await findAttendanceEmployee(req, res);
    if (!employee) return;
    const latitude = parseCoordinate(req.body.latitude, -90, 90);
    const longitude = parseCoordinate(req.body.longitude, -180, 180);
    if (latitude === null || longitude === null) {
      return res.status(400).json({ message: 'Koordinat GPS tidak valid. Muat ulang lokasi lalu coba lagi.' });
    }
    const result = await checkLocationForEmployee(employee.id, latitude, longitude);
    if (!result) {
      return res.status(409).json({ message: 'Lokasi cabang absensi belum diatur oleh administrator.', inRadius: false });
    }
    return res.json({
      inRadius: result.inRadius,
      distanceMeters: result.distanceMeters,
      radiusMeters: result.radiusMeters,
      locationName: result.settingName,
      message: result.inRadius
        ? `Anda berada ${result.distanceMeters} meter dari lokasi ${result.settingName}.`
        : `Anda berjarak ${result.distanceMeters} meter dari ${result.settingName}, di luar radius ${result.radiusMeters} meter.`
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal memeriksa radius absensi.' });
  }
};

export const submitAttendance = async (req: AuthRequest, res: Response) => {
  let writtenPhotoPath: string | null = null;
  try {
    const employee = await findAttendanceEmployee(req, res);
    if (!employee) return;

    const { type, photo, latitude, longitude, browser, device } = req.body;
    if (type !== 'CHECK_IN' && type !== 'CHECK_OUT') {
      return res.status(400).json({ message: 'Jenis absensi tidak valid.' });
    }
    const parsedLatitude = parseCoordinate(latitude, -90, 90);
    const parsedLongitude = parseCoordinate(longitude, -180, 180);
    if (parsedLatitude === null || parsedLongitude === null) {
      return res.status(400).json({ message: 'Koordinat GPS tidak valid. Muat ulang lokasi lalu coba lagi.' });
    }
    const parsedPhoto = parsePhoto(photo);
    if (!parsedPhoto) {
      return res.status(400).json({ message: 'Foto selfie harus berupa JPEG/PNG yang valid dan maksimal 5 MB.' });
    }
    const location = await checkLocationForEmployee(employee.id, parsedLatitude, parsedLongitude);
    if (!location) {
      return res.status(409).json({ message: 'Lokasi outlet absensi belum diatur oleh administrator.' });
    }
    if (!location.inRadius) {
      return res.status(403).json({
        message: `Absensi ditolak. Anda berjarak ${location.distanceMeters} meter dari lokasi cabang ${location.settingName}, di luar radius ${location.radiusMeters} meter.`,
        code: 'OUTSIDE_ATTENDANCE_RADIUS',
        distanceMeters: location.distanceMeters,
        radiusMeters: location.radiusMeters,
        inRadius: false
      });
    }

    let attendance;
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, clockOut: null, deletedAt: null },
      orderBy: { date: 'desc' }
    });

    if (type === 'CHECK_IN') {
      if (existing) {
        return res.status(409).json({ message: 'Anda masih dalam status check-in. Lakukan check-out terlebih dahulu.' });
      }
    } else if (!existing) {
      return res.status(409).json({ message: 'Tidak ada check-in aktif untuk di-check-out.' });
    }

    const savedPhoto = saveImage(parsedPhoto);
    writtenPhotoPath = savedPhoto.filepath;
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    if (type === 'CHECK_IN') {
      let attendanceStatus = 'PRESENT';
      const now = new Date();

      // Check shift and late tolerance
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const shiftAssignment = await prisma.workSchedule.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: todayStart, lte: todayEnd },
          deletedAt: null
        },
        include: { shift: true }
      });

      const activeShift = shiftAssignment?.shift || employee.shift;
      if (activeShift) {
        const [startHour, startMin] = activeShift.startTime.split(':').map(Number);
        const shiftStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin, 0);

        const toleranceSetting = await prisma.setting.findFirst({ where: { key: 'LATE_TOLERANCE_MINUTES', deletedAt: null } });
        const toleranceMins = toleranceSetting ? (parseInt(toleranceSetting.value, 10) || 15) : 15;

        const lateThreshold = new Date(shiftStart.getTime() + toleranceMins * 60 * 1000);
        if (now > lateThreshold) {
          attendanceStatus = 'LATE';
        }
      }

      attendance = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          outletId: location.outlet?.id || null,
          date: now,
          clockIn: now,
          status: attendanceStatus,
          photos: {
            create: {
              photoUrl: savedPhoto.url,
              type: 'CLOCK_IN',
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              ipAddress: ipAddress.toString(),
              browser: typeof browser === 'string' ? browser.slice(0, 500) : undefined,
              device: typeof device === 'string' ? device.slice(0, 200) : undefined
            }
          }
        },
        include: { employee: true, outlet: true, photos: true }
      });
    } else {
      attendance = await prisma.attendance.update({
        where: { id: existing!.id },
        data: {
          clockOut: new Date(),
          photos: {
            create: {
              photoUrl: savedPhoto.url,
              type: 'CLOCK_OUT',
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              ipAddress: ipAddress.toString(),
              browser: typeof browser === 'string' ? browser.slice(0, 500) : undefined,
              device: typeof device === 'string' ? device.slice(0, 200) : undefined
            }
          }
        },
        include: { employee: true, outlet: true, photos: true }
      });
    }

    const io = req.app.get('io') as Server | undefined;
    if (io) {
      io.emit('attendance_update', {
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName || ''}`.trim(),
        type,
        status: attendance.status,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        outletName: location.settingName,
        photoUrl: savedPhoto.url,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: type === 'CHECK_IN' ? 'Check-in berhasil.' : 'Check-out berhasil.',
      attendance,
      photoUrl: savedPhoto.url,
      locationName: location.settingName
    });
  } catch (error) {
    if (writtenPhotoPath && fs.existsSync(writtenPhotoPath)) {
      try {
        fs.unlinkSync(writtenPhotoPath);
      } catch (e) {
        console.error('Gagal menghapus file foto temp setelah error:', e);
      }
    }
    console.error(error);
    res.status(500).json({ message: 'Gagal memproses absensi.' });
  }
};

export const getMonitoring = async (req: Request, res: Response) => {
  try {
    const { date, search, outletId } = req.query;
    
    let targetDate = new Date();
    if (date && typeof date === 'string') {
      targetDate = new Date(date);
    }
    
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const whereClause: any = {
      deletedAt: null,
      user: {
        deletedAt: null,
        role: {
          name: { notIn: [...HIDDEN_ROLES] as string[] }
        }
      }
    };

    if (outletId && typeof outletId === 'string' && outletId !== 'ALL') {
      whereClause.outletId = outletId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { user: { username: { contains: q } } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: { select: { username: true, role: { select: { name: true } } } },
        shift: true,
        outlet: true,
        workSchedules: {
          where: {
            date: { gte: startOfDay, lte: endOfDay },
            deletedAt: null
          },
          include: { shift: true, outlet: true }
        },
        attendances: {
          where: {
            date: { gte: startOfDay, lte: endOfDay },
            deletedAt: null
          },
          include: { photos: true, outlet: true },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    const monitoringData = employees.map(emp => {
      const schedule = emp.workSchedules[0];
      const attendance = emp.attendances[0];
      const activeShift = schedule?.shift || emp.shift;
      const activeOutlet = schedule?.outlet || emp.outlet;

      let status = 'ABSENT';
      if (attendance) {
        status = attendance.status;
      }

      return {
        employee: {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName || '',
          position: emp.user.role.name || 'Karyawan',
          roleName: emp.user.role.name || 'Karyawan'
        },
        shift: activeShift ? {
          name: activeShift.name,
          startTime: activeShift.startTime,
          endTime: activeShift.endTime
        } : null,
        attendance: attendance ? {
          id: attendance.id,
          clockIn: attendance.clockIn ? attendance.clockIn.toISOString() : null,
          clockOut: attendance.clockOut ? attendance.clockOut.toISOString() : null,
          photos: attendance.photos || []
        } : null,
        status
      };
    });

    res.json(monitoringData);
  } catch (error) {
    console.error('getMonitoring error:', error);
    res.status(500).json({ message: 'Gagal memuat monitoring absensi.' });
  }
};
