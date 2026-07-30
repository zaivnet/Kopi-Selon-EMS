import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { HIDDEN_ROLES } from '../lib/constants.js';

export const getMyEmployeeProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const employee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      include: {
        user: { include: { role: true } },
        shift: true,
        workSchedules: {
          where: { deletedAt: null },
          include: { shift: true }
        },
        leaves: {
          where: { status: 'APPROVED', deletedAt: null }
        },
        permissions: {
          where: { status: 'APPROVED', deletedAt: null }
        }
      }
    });

    if (!employee) return res.status(404).json({ message: 'Profil karyawan tidak ditemukan.' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          include: {
            role: true
          }
        },
        shift: true,
        workSchedules: {
          where: { deletedAt: null },
          include: { shift: true }
        },
        leaves: {
          where: { status: 'APPROVED', deletedAt: null }
        },
        permissions: {
          where: { status: 'APPROVED', deletedAt: null }
        }
      },
      where: {
        deletedAt: null,
        user: {
          deletedAt: null,
          role: { name: { notIn: HIDDEN_ROLES as unknown as string[] } }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employee = await prisma.employee.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: { include: { role: true } },
        shift: true,
        workSchedules: {
          where: { deletedAt: null },
          include: { shift: true }
        }
      }
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, firstName: reqFirstName, lastName: reqLastName,
      username, password, roleId,
      gender, phone, address, 
      status, shiftId, joinDate, baseSalary
    } = req.body;

    // Support single name field "Nama Karyawan" or firstName/lastName
    let firstName = reqFirstName;
    let lastName = reqLastName;

    if (name && typeof name === 'string') {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    if (!username || !password || !roleId || !firstName) {
      return res.status(400).json({ message: 'Username, password, role, dan nama karyawan wajib diisi' });
    }

    // Check if username exists
    const existingUser = await prisma.user.findFirst({
      where: { username: username.trim() }
    });
    if (existingUser) return res.status(400).json({ message: 'Username sudah digunakan' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const parsedSalary = (baseSalary !== undefined && baseSalary !== null && baseSalary !== '') 
      ? parseFloat(baseSalary) 
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: username.trim(), password: hashedPassword, roleId }
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          firstName,
          lastName: lastName || null,
          gender: gender || null,
          phone: phone || null,
          address: address || null,
          status: status || 'ACTIVE',
          shiftId: shiftId || null,
          joinDate: joinDate ? new Date(joinDate) : null,
          baseSalary: (parsedSalary !== null && !isNaN(parsedSalary)) ? parsedSalary : null,
        }
      });
      return employee;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Create Employee Error:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      name, firstName: reqFirstName, lastName: reqLastName,
      username: reqUsername, password: reqPassword,
      gender, phone, address, 
      status, shiftId, joinDate, baseSalary, roleId
    } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Handle username check if provided
    const newUsername = (typeof reqUsername === 'string' && reqUsername.trim()) ? reqUsername.trim() : null;
    if (newUsername && newUsername !== employee.user.username) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          username: newUsername,
          id: { not: employee.userId }
        }
      });
      if (duplicateUser) {
        return res.status(400).json({ message: 'Username sudah digunakan oleh akun lain' });
      }
    }

    let firstName = reqFirstName ?? employee.firstName;
    let lastName = reqLastName ?? employee.lastName;

    if (name && typeof name === 'string') {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const parsedSalary = (baseSalary !== undefined && baseSalary !== null && baseSalary !== '') 
      ? parseFloat(baseSalary) 
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: {
          firstName,
          lastName: lastName !== undefined ? (lastName || null) : employee.lastName,
          gender: gender !== undefined ? (gender || null) : employee.gender,
          phone: phone !== undefined ? (phone || null) : employee.phone,
          address: address !== undefined ? (address || null) : employee.address,
          status: status || employee.status,
          shiftId: shiftId !== undefined ? (shiftId || null) : employee.shiftId,
          joinDate: joinDate ? new Date(joinDate) : employee.joinDate,
          baseSalary: baseSalary !== undefined 
            ? ((parsedSalary !== null && !isNaN(parsedSalary)) ? parsedSalary : null) 
            : employee.baseSalary,
        }
      });

      const userUpdateData: any = {};
      if (newUsername && newUsername !== employee.user.username) {
        userUpdateData.username = newUsername;
      }
      if (roleId && roleId !== employee.user.roleId) {
        userUpdateData.roleId = roleId;
      }
      if (typeof reqPassword === 'string' && reqPassword.trim().length > 0) {
        userUpdateData.password = await bcrypt.hash(reqPassword.trim(), 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: employee.userId },
          data: userUpdateData
        });
      }
    });

    res.json({ message: 'Employee updated successfully' });
  } catch (error: any) {
    console.error('Update Employee Error:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'Username atau data sudah terdaftar' });
    }
    res.status(500).json({ message: error?.message || 'Internal server error' });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Soft delete
    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { user: true }
      });

      await tx.user.update({
        where: { id: employee.userId },
        data: { deletedAt: new Date() }
      });
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: employee.userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Check if a file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    const employee = await prisma.employee.update({
      where: { id },
      data: { photoUrl }
    });

    res.json({ message: 'Photo uploaded successfully', photoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};