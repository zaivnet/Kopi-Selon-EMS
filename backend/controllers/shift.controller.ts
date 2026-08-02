import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { HIDDEN_ROLES } from '../lib/constants.js';

export const getShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await prisma.workShift.findMany({
      where: { deletedAt: null },
      include: {
        employees: {
          where: {
            deletedAt: null,
            user: {
              deletedAt: null,
              role: { name: { notIn: HIDDEN_ROLES as unknown as string[] } }
            }
          },
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createShift = async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime } = req.body;
    const shift = await prisma.workShift.create({
      data: { name, startTime, endTime }
    });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, startTime, endTime } = req.body;
    const shift = await prisma.workShift.update({
      where: { id },
      data: { name, startTime, endTime }
    });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteShift = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const shift = await prisma.workShift.findUnique({
      where: { id },
      include: { employees: { where: { deletedAt: null } } }
    });

    if (shift && shift.employees.length > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus shift yang masih memiliki karyawan' });
    }

    await prisma.workShift.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const assignShift = async (req: Request, res: Response) => {
  try {
    const { shiftId, employeeIds } = req.body;

    if (typeof shiftId !== 'string' || !shiftId.trim()) {
      return res.status(400).json({ message: 'Shift wajib dipilih.' });
    }

    if (!Array.isArray(employeeIds)) {
      return res.status(400).json({ message: 'Daftar karyawan harus berupa array.' });
    }

    if (employeeIds.length > 500) {
      return res.status(400).json({ message: 'Maksimal 500 karyawan dapat ditugaskan sekaligus.' });
    }

    const normalizedEmployeeIds = employeeIds.map((id) =>
      typeof id === 'string' ? id.trim() : ''
    );
    if (normalizedEmployeeIds.some((id) => !id)) {
      return res.status(400).json({ message: 'Setiap ID karyawan harus berupa teks dan tidak boleh kosong.' });
    }

    if (new Set(normalizedEmployeeIds).size !== normalizedEmployeeIds.length) {
      return res.status(400).json({ message: 'Daftar karyawan tidak boleh berisi ID duplikat.' });
    }

    const shift = await prisma.workShift.findFirst({
      where: { id: shiftId.trim(), deletedAt: null },
      select: { id: true, name: true }
    });
    if (!shift) {
      return res.status(404).json({ message: 'Shift tidak ditemukan atau sudah dihapus.' });
    }

    const eligibleEmployees = normalizedEmployeeIds.length === 0
      ? []
      : await prisma.employee.findMany({
        where: {
          id: { in: normalizedEmployeeIds },
          deletedAt: null,
          status: 'ACTIVE',
          user: {
            deletedAt: null,
            role: { name: { in: ['Karyawan', 'Staff'] }, deletedAt: null }
          }
        },
        select: { id: true }
      });

    const eligibleIds = new Set(eligibleEmployees.map((employee) => employee.id));
    const rejectedIds = normalizedEmployeeIds.filter((id) => !eligibleIds.has(id));
    if (rejectedIds.length > 0) {
      return res.status(400).json({
        message: `${rejectedIds.length} karyawan tidak ditemukan, tidak aktif, sudah dihapus, atau bukan Karyawan/Staff.`,
        invalidEmployeeIds: rejectedIds
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const unassigned = await tx.employee.updateMany({
        where: {
          shiftId: shift.id,
          deletedAt: null,
          id: { notIn: normalizedEmployeeIds }
        },
        data: { shiftId: null }
      });

      const assigned = normalizedEmployeeIds.length === 0
        ? { count: 0 }
        : await tx.employee.updateMany({
          where: { id: { in: normalizedEmployeeIds } },
          data: { shiftId: shift.id }
        });

      return { assigned: assigned.count, unassigned: unassigned.count };
    });

    res.json({
      message: `Penugasan shift ${shift.name} berhasil: ${result.assigned} karyawan ditugaskan, ${result.unassigned} karyawan dilepas.`,
      assignedCount: result.assigned,
      unassignedCount: result.unassigned
    });
  } catch (error) {
    console.error('Gagal menyimpan penugasan shift:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Shift atau karyawan tidak ditemukan.' });
    }
    res.status(500).json({ message: 'Terjadi kesalahan server saat menyimpan penugasan shift.' });
  }
};

export const getWorkSchedules = async (req: Request, res: Response) => {
  try {
    const { month, year, startDate: reqStart, endDate: reqEnd } = req.query;
    let startDate: Date;
    let endDate: Date;

    // ── Normalisasi ke WIB (UTC+7) ───────────────────────────────────────────
    // Selalu gunakan ISO string dengan offset +07:00 agar tidak tergantung
    // timezone OS/server. new Date('YYYY-MM-DDT00:00:00+07:00') selalu benar.
    if (reqStart && reqEnd && typeof reqStart === 'string' && typeof reqEnd === 'string') {
      startDate = new Date(`${reqStart}T00:00:00+07:00`);
      endDate   = new Date(`${reqEnd}T23:59:59+07:00`);
    } else if (month && typeof month === 'string' && month.includes('-')) {
      const [y, m] = month.split('-').map(Number);
      // Bulan pertama
      const firstDay = new Date(Date.UTC(y, m - 1, 1) - 7 * 60 * 60 * 1000);
      // Bulan berikutnya hari ke-0 = hari terakhir bulan ini
      const lastDay  = new Date(Date.UTC(y, m, 0, 23, 59, 59) - 7 * 60 * 60 * 1000 + 59 * 1000);
      startDate = firstDay;
      endDate   = lastDay;
    } else {
      const now = new Date();
      // Ambil tanggal WIB
      const wibMs  = now.getTime() + 7 * 60 * 60 * 1000;
      const wibDate = new Date(wibMs);
      const m  = month ? parseInt(month as string, 10) - 1 : wibDate.getUTCMonth();
      const y  = year  ? parseInt(year  as string, 10)     : wibDate.getUTCFullYear();
      startDate = new Date(`${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00+07:00`);
      // Hari ke-0 bulan berikutnya = hari terakhir bulan ini
      const lastDayNum = new Date(y, m + 1, 0).getDate();
      endDate = new Date(`${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}T23:59:59+07:00`);
    }

    const schedules = await prisma.workSchedule.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        deletedAt: null
      },
      include: {
        shift: true,
        outlet: true,
        employee: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json(schedules);
  } catch (error) {
    console.error('getWorkSchedules Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const bulkSaveWorkSchedules = async (req: Request, res: Response) => {
  try {
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: 'Payload schedules harus berupa array yang tidak kosong.' });
    }

    // Fetch valid active employees and active shifts
    const [activeEmployees, activeShifts] = await Promise.all([
      prisma.employee.findMany({ where: { deletedAt: null }, select: { id: true } }),
      prisma.workShift.findMany({ where: { deletedAt: null }, select: { id: true } })
    ]);

    const validEmployeeIds = new Set(activeEmployees.map((e) => e.id));
    const validShiftIds = new Set(activeShifts.map((s) => s.id));

    const employeeIdsSet = new Set<string>();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const newEntries: { id: string; employeeId: string; shiftId: string; outletId?: string | null; date: Date }[] = [];

    for (const item of schedules) {
      if (!item.employeeId || !item.date) continue;
      if (!validEmployeeIds.has(item.employeeId)) continue;

      employeeIdsSet.add(item.employeeId);

      const dateObj = new Date(item.date);
      if (isNaN(dateObj.getTime())) continue;

      const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0);
      const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

      if (!minDate || dayStart < minDate) minDate = dayStart;
      if (!maxDate || dayEnd > maxDate) maxDate = dayEnd;

      if (item.shiftId && typeof item.shiftId === 'string' && item.shiftId !== 'OFF' && item.shiftId.trim() !== '') {
        const cleanShiftId = item.shiftId.trim();
        if (validShiftIds.has(cleanShiftId)) {
          newEntries.push({
            id: crypto.randomUUID(),
            employeeId: item.employeeId,
            shiftId: cleanShiftId,
            outletId: item.outletId || null,
            date: dayStart
          });
        }
      }
    }

    const employeeIds = Array.from(employeeIdsSet);

    if (employeeIds.length === 0 || !minDate || !maxDate) {
      return res.json({ message: 'Tidak ada data jadwal valid untuk disimpan.', count: 0 });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Delete all existing work schedules for these employees within the date range in 1 batch query
        await tx.workSchedule.deleteMany({
          where: {
            employeeId: { in: employeeIds },
            date: { gte: minDate!, lte: maxDate! }
          }
        });

        // 2. Insert all new work schedules in 1 batch query
        if (newEntries.length > 0) {
          await tx.workSchedule.createMany({
            data: newEntries
          });
        }

        return newEntries.length;
      },
      { timeout: 20000 }
    );

    res.json({ message: 'Roster matriks berhasil disimpan.', count: result });
  } catch (error: any) {
    console.error('bulkSaveWorkSchedules Error:', error);
    res.status(500).json({ message: error?.message || 'Gagal menyimpan roster matriks.' });
  }
};

export const clearAllShifts = async (req: Request, res: Response) => {
  try {
    const deletedCount = await prisma.workShift.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() }
    });

    res.json({
      message: 'Semua data Shift Kerja berhasil dibersihkan.',
      deletedCount: deletedCount.count
    });
  } catch (error: any) {
    console.error('clearAllShifts Error:', error);
    res.status(500).json({ message: 'Gagal membersihkan data Shift Kerja.' });
  }
};

