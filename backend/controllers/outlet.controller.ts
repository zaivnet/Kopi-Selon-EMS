import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export const getOutlets = async (req: Request, res: Response) => {
  try {
    const outlets = await prisma.outlet.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            employees: { where: { deletedAt: null } },
            workSchedules: { where: { deletedAt: null } }
          }
        }
      },
      orderBy: { code: 'asc' }
    });
    res.json(outlets);
  } catch (error) {
    console.error('getOutlets error:', error);
    res.status(500).json({ message: 'Gagal mengambil data outlet cabang.' });
  }
};

export const getOutlet = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const outlet = await prisma.outlet.findFirst({
      where: { id, deletedAt: null }
    });
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet cabang tidak ditemukan.' });
    }
    res.json(outlet);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil detail outlet.' });
  }
};

export const createOutlet = async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, address, phone, latitude, longitude, radius, isActive } = req.body;

    if (!code || !name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Kode, Nama, Latitude, dan Longitude wajib diisi.' });
    }

    const codeStr = String(code).trim().toUpperCase();
    const nameStr = String(name).trim();

    const existing = await prisma.outlet.findFirst({
      where: {
        OR: [
          { code: codeStr },
          { name: nameStr }
        ],
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Kode atau Nama Outlet Cabang sudah digunakan.' });
    }

    const outlet = await prisma.outlet.create({
      data: {
        code: codeStr,
        name: nameStr,
        address: address ? String(address).trim() : null,
        phone: phone ? String(phone).trim() : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseInt(radius, 10) : 100,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json(outlet);
  } catch (error: any) {
    console.error('createOutlet error:', error);
    res.status(500).json({ message: error?.message || 'Gagal menambahkan outlet cabang baru.' });
  }
};

export const updateOutlet = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { code, name, address, phone, latitude, longitude, radius, isActive } = req.body;

    const existing = await prisma.outlet.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Outlet cabang tidak ditemukan.' });
    }

    const codeStr = code ? String(code).trim().toUpperCase() : existing.code;
    const nameStr = name ? String(name).trim() : existing.name;

    if (codeStr !== existing.code) {
      const duplicateCode = await prisma.outlet.findFirst({
        where: { code: codeStr, id: { not: id }, deletedAt: null }
      });
      if (duplicateCode) {
        return res.status(400).json({ message: 'Kode Outlet sudah digunakan oleh cabang lain.' });
      }
    }

    const updated = await prisma.outlet.update({
      where: { id },
      data: {
        code: codeStr,
        name: nameStr,
        address: address !== undefined ? (address ? String(address).trim() : null) : existing.address,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
        latitude: latitude !== undefined ? parseFloat(latitude) : existing.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : existing.longitude,
        radius: radius !== undefined ? parseInt(radius, 10) : existing.radius,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('updateOutlet error:', error);
    res.status(500).json({ message: 'Gagal memperbarui data outlet cabang.' });
  }
};

export const deleteOutlet = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const outlet = await prisma.outlet.findFirst({
      where: { id, deletedAt: null },
      include: {
        employees: { where: { deletedAt: null } }
      }
    });

    if (!outlet) {
      return res.status(404).json({ message: 'Outlet cabang tidak ditemukan.' });
    }

    if (outlet.employees.length > 0) {
      return res.status(400).json({
        message: `Tidak dapat menghapus cabang '${outlet.name}' karena masih terdapat ${outlet.employees.length} karyawan terdaftar pada cabang ini.`
      });
    }

    await prisma.outlet.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Outlet cabang berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus outlet cabang.' });
  }
};
