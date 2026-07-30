import { prisma } from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { HIDDEN_ROLES } from '../lib/constants.js';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of the earth in m
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in m
    return d;
}
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
const parseCoordinate = (value, min, max) => {
    const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    return Number.isFinite(number) && number >= min && number <= max ? number : null;
};
const parsePhoto = (photo) => {
    if (typeof photo !== 'string')
        return null;
    const matches = photo.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!matches)
        return null;
    const buffer = Buffer.from(matches[2], 'base64');
    if (!buffer.length || buffer.length > MAX_PHOTO_BYTES)
        return null;
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if ((matches[1] === 'jpeg' && !jpeg) || (matches[1] === 'png' && !png))
        return null;
    return { buffer, extension: matches[1] === 'png' ? 'png' : 'jpg' };
};
const saveImage = (image) => {
    const filename = `${uuidv4()}.${image.extension}`;
    const filepath = path.resolve(process.cwd(), 'uploads', filename);
    fs.writeFileSync(filepath, image.buffer);
    return { filepath, url: `/uploads/${filename}` };
};
const findAttendanceEmployee = async (req, res) => {
    const role = req.user?.role?.name;
    if (!['Karyawan', 'Staff'].includes(role)) {
        res.status(403).json({ message: 'Absensi selfie hanya tersedia untuk Karyawan dan Staff.' });
        return null;
    }
    const employee = await prisma.employee.findFirst({
        where: { userId: req.user.id, deletedAt: null, status: 'ACTIVE' }
    });
    if (!employee) {
        res.status(403).json({ message: role === 'Staff' ? 'Akun Staff belum terhubung ke data karyawan aktif. Hubungi administrator.' : 'Data karyawan aktif tidak ditemukan.' });
        return null;
    }
    return employee;
};
const checkLocation = async (latitude, longitude) => {
    const setting = await prisma.locationSetting.findFirst({ where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } });
    if (!setting)
        return null;
    const distance = getDistanceFromLatLonInM(latitude, longitude, Number(setting.latitude), Number(setting.longitude));
    return {
        setting,
        inRadius: distance <= Number(setting.radius),
        distanceMeters: Math.round(distance),
        radiusMeters: Number(setting.radius)
    };
};
export const getStatus = async (req, res) => {
    try {
        const employee = await findAttendanceEmployee(req, res);
        if (!employee)
            return;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const activeAttendance = await prisma.attendance.findFirst({
            where: {
                employeeId: employee.id,
                clockOut: null,
                deletedAt: null
            },
            orderBy: { date: 'desc' }
        });
        const todayAttendance = await prisma.attendance.findFirst({
            where: {
                employeeId: employee.id,
                date: { gte: todayStart, lte: todayEnd },
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
        });
        const todayShiftAssignment = await prisma.workSchedule.findFirst({
            where: {
                employeeId: employee.id,
                date: { gte: todayStart, lte: todayEnd },
                deletedAt: null
            },
            include: { shift: true }
        });
        const recentLogs = await prisma.attendance.findMany({
            where: {
                employeeId: employee.id,
                deletedAt: null
            },
            orderBy: { date: 'desc' },
            take: 10
        });
        const location = await prisma.locationSetting.findFirst({
            where: { deletedAt: null },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({
            isCheckedIn: !!activeAttendance,
            attendance: activeAttendance || todayAttendance,
            todayAttendance,
            shift: todayShiftAssignment?.shift || null,
            recentLogs,
            canClockIn: !activeAttendance && !todayAttendance?.clockOut,
            canClockOut: !!activeAttendance,
            locationConfigured: !!location,
            location: location ? {
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                radiusMeters: location.radius
            } : null
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat status absensi.' });
    }
};
export const getMyAttendances = async (req, res) => {
    try {
        const employee = await findAttendanceEmployee(req, res);
        if (!employee)
            return;
        const attendances = await prisma.attendance.findMany({
            where: {
                employeeId: employee.id,
                deletedAt: null
            },
            orderBy: { date: 'desc' },
            take: 50
        });
        res.json(attendances);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat riwayat presensi.' });
    }
};
export const checkAttendanceLocation = async (req, res) => {
    try {
        const employee = await findAttendanceEmployee(req, res);
        if (!employee)
            return;
        const latitude = parseCoordinate(req.body.latitude, -90, 90);
        const longitude = parseCoordinate(req.body.longitude, -180, 180);
        if (latitude === null || longitude === null) {
            return res.status(400).json({ message: 'Koordinat GPS tidak valid. Muat ulang lokasi lalu coba lagi.' });
        }
        const result = await checkLocation(latitude, longitude);
        if (!result) {
            return res.status(409).json({ message: 'Lokasi absensi belum diatur oleh administrator.', inRadius: false });
        }
        return res.json({
            inRadius: result.inRadius,
            distanceMeters: result.distanceMeters,
            radiusMeters: result.radiusMeters,
            locationName: result.setting.name,
            message: result.inRadius
                ? `Anda berada ${result.distanceMeters} meter dari lokasi kerja.`
                : `Anda berjarak ${result.distanceMeters} meter dari lokasi kerja, di luar radius ${result.radiusMeters} meter.`
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Gagal memeriksa radius absensi.' });
    }
};
export const submitAttendance = async (req, res) => {
    let writtenPhotoPath = null;
    try {
        const employee = await findAttendanceEmployee(req, res);
        if (!employee)
            return;
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
        const location = await checkLocation(parsedLatitude, parsedLongitude);
        if (!location) {
            return res.status(409).json({ message: 'Lokasi absensi belum diatur oleh administrator.' });
        }
        if (!location.inRadius) {
            return res.status(403).json({
                message: `Absensi ditolak. Anda berjarak ${location.distanceMeters} meter dari lokasi kerja, di luar radius yang diizinkan ${location.radiusMeters} meter.`,
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
        }
        else if (!existing) {
            return res.status(409).json({ message: 'Tidak ada check-in aktif untuk di-check-out.' });
        }
        const savedPhoto = saveImage(parsedPhoto);
        writtenPhotoPath = savedPhoto.filepath;
        const ipAddress = req.ip || req.socket.remoteAddress || '';
        if (type === 'CHECK_IN') {
            attendance = await prisma.attendance.create({
                data: {
                    employeeId: employee.id,
                    date: new Date(),
                    clockIn: new Date(),
                    status: 'PRESENT', // default, can be LATE logic later
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
                include: { employee: true, photos: true }
            });
        }
        else {
            attendance = await prisma.attendance.update({
                where: { id: existing.id },
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
                include: { employee: true, photos: true }
            });
        }
        writtenPhotoPath = null;
        const io = req.app.get('io');
        if (io) {
            io.emit('attendance_update', attendance);
        }
        res.json({
            message: type === 'CHECK_IN' ? 'Check-in berhasil. Selamat bekerja!' : 'Check-out berhasil. Terima kasih atas kerja hari ini!',
            attendance,
            distanceMeters: location.distanceMeters,
            radiusMeters: location.radiusMeters
        });
    }
    catch (error) {
        console.error(error);
        if (writtenPhotoPath) {
            try {
                fs.unlinkSync(writtenPhotoPath);
            }
            catch (cleanupError) {
                console.error('Gagal membersihkan foto absensi:', cleanupError);
            }
        }
        res.status(500).json({ message: 'Absensi gagal disimpan. Silakan coba lagi.' });
    }
};
export const getMonitoring = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const yesterday = new Date(startOfDay);
        yesterday.setDate(yesterday.getDate() - 1);
        const now = new Date();
        const employees = await prisma.employee.findMany({
            where: {
                deletedAt: null,
                user: {
                    deletedAt: null,
                    role: { name: { notIn: HIDDEN_ROLES } }
                }
            },
            include: {
                shift: true,
                user: { select: { role: true } },
                attendances: {
                    where: {
                        date: { gte: yesterday },
                        deletedAt: null
                    },
                    include: {
                        photos: true
                    }
                }
            }
        });
        const monitoringData = employees.map((emp) => {
            // Find the most relevant attendance (latest one that is active, or today's)
            const activeOrToday = emp.attendances.sort((a, b) => b.date.getTime() - a.date.getTime()).find((a) => !a.clockOut || a.date >= startOfDay);
            const attendance = activeOrToday || emp.attendances.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
            let status = 'Belum Masuk';
            let statusColor = 'bg-gray-500';
            if (attendance) {
                if (attendance.clockOut) {
                    status = 'Sudah Pulang';
                    statusColor = 'bg-blue-500';
                }
                else {
                    status = 'Sedang Bekerja';
                    statusColor = 'bg-emerald-500';
                }
            }
            else {
                if (emp.shift) {
                    const [startHour, startMin] = emp.shift.startTime.split(':').map(Number);
                    const [endHour, endMin] = emp.shift.endTime.split(':').map(Number);
                    let shiftStart = new Date();
                    shiftStart.setHours(startHour, startMin, 0, 0);
                    let shiftEnd = new Date();
                    shiftEnd.setHours(endHour, endMin, 0, 0);
                    // Handle overnight shifts
                    if (shiftEnd < shiftStart) {
                        if (now.getHours() < endHour) {
                            shiftStart.setDate(shiftStart.getDate() - 1);
                        }
                        else {
                            shiftEnd.setDate(shiftEnd.getDate() + 1);
                        }
                    }
                    if (now > shiftEnd) {
                        status = 'Tidak Hadir';
                        statusColor = 'bg-red-500';
                    }
                    else if (now > shiftStart) {
                        status = 'Terlambat';
                        statusColor = 'bg-amber-500';
                    }
                    else {
                        status = 'Belum Masuk';
                        statusColor = 'bg-gray-500';
                    }
                }
                else {
                    status = 'Belum Masuk';
                    statusColor = 'bg-gray-500';
                }
            }
            return {
                employee: {
                    id: emp.id,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    position: emp.position || emp.user?.role?.name || 'Karyawan',
                    roleName: emp.user?.role?.name || 'Karyawan',
                },
                shift: emp.shift,
                attendance: attendance || null,
                status,
                statusColor
            };
        });
        res.json(monitoringData);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
