import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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
