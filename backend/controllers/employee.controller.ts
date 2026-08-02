import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { HIDDEN_ROLES } from '../lib/constants.js';

const STAFF_ASSIGNABLE_ROLES = ['Karyawan'];

export const getMyEmployeeProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const employee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      include: {
        user: { include: { role: true } },
        shift: true,
        outlet: true,
        workSchedules: {
          where: { deletedAt: null },
          include: { shift: true, outlet: true }
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
    const userRole = req.user?.role?.name;
    const hideOwner = userRole !== 'Administrator' && userRole !== 'Owner';
    const excludedRoleNames = [...HIDDEN_ROLES] as string[];
    if (hideOwner) {
      excludedRoleNames.push('Owner');
    }

    // Jadwal hanya dibutuhkan untuk 7 hari ke depan (dashboard: hari ini, besok, lusa + sedikit buffer).
    // Gunakan WIB offset agar tidak bergantung timezone server.
    const WIB_MS = 7 * 60 * 60 * 1000;
    const nowWib = new Date(Date.now() + WIB_MS);
    const todayWibStr = `${nowWib.getUTCFullYear()}-${String(nowWib.getUTCMonth() + 1).padStart(2, '0')}-${String(nowWib.getUTCDate()).padStart(2, '0')}`;
    const scheduleStart = new Date(`${todayWibStr}T00:00:00+07:00`);
    const scheduleEnd   = new Date(scheduleStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const employees = await prisma.employee.findMany({
      include: {
        user: {
          include: {
            role: true
          }
        },
        shift: true,
        outlet: true,
        workSchedules: {
          // Hanya ambil jadwal 7 hari ke depan — mencegah payload besar dari data historis
          where: { deletedAt: null, date: { gte: scheduleStart, lte: scheduleEnd } },
          include: { shift: true, outlet: true }
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
          role: { name: { notIn: excludedRoleNames } }
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

    // Restrict Staff/Karyawan from viewing Owner profile
    const userRole = req.user?.role?.name;
    const targetRole = employee.user?.role?.name;
    if (targetRole === 'Owner' && userRole !== 'Administrator' && userRole !== 'Owner') {
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat profil Owner.' });
    }

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
      status, shiftId, outletId, joinDate, baseSalary
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

    const currentUserRole = req.user?.role?.name || req.user?.role;
    const selectedRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (selectedRole?.name === 'Owner' && currentUserRole !== 'Administrator' && currentUserRole !== 'Owner') {
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk menetapkan role Owner.' });
    }
    if (currentUserRole === 'Staff') {
      if (selectedRole && !STAFF_ASSIGNABLE_ROLES.includes(selectedRole.name)) {
        return res.status(403).json({ message: 'Staff hanya boleh menetapkan role Staff atau Karyawan.' });
      }
    }

    // Check if username exists among active users
    const existingUser = await prisma.user.findFirst({
      where: { username: username.trim(), deletedAt: null }
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
          outletId: outletId || null,
          joinDate: joinDate ? new Date(joinDate) : null,
          baseSalary: (parsedSalary !== null && !isNaN(parsedSalary)) ? parsedSalary : null,
        }
      });
      return employee;
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_EMPLOYEE',
        entity: 'Employee',
        entityId: result.id,
        details: JSON.stringify({
          username: username.trim(),
          name: `${result.firstName} ${result.lastName || ''}`.trim(),
          status: result.status,
          outletId: result.outletId
        }),
        ipAddress: req.ip || null
      }
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
      status, shiftId, outletId, joinDate, baseSalary, roleId
    } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { include: { role: true } } }
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const currentUserRole = req.user?.role?.name || req.user?.role;
    const targetEmployeeRole = employee.user?.role?.name;

    // Staff/Karyawan tidak bisa mengedit data Owner
    if (targetEmployeeRole === 'Owner' && currentUserRole !== 'Administrator' && currentUserRole !== 'Owner') {
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah profil Owner.' });
    }

    if (roleId && roleId !== employee.user.roleId) {
      const selectedRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (selectedRole?.name === 'Owner' && currentUserRole !== 'Administrator' && currentUserRole !== 'Owner') {
        return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk menetapkan role Owner.' });
      }
      if (currentUserRole === 'Staff') {
        if (selectedRole && !STAFF_ASSIGNABLE_ROLES.includes(selectedRole.name)) {
          return res.status(403).json({ message: 'Staff hanya boleh menetapkan role Staff atau Karyawan.' });
        }
      }
    }

    // Handle username check if provided
    const newUsername = (typeof reqUsername === 'string' && reqUsername.trim()) ? reqUsername.trim() : null;
    if (newUsername && newUsername !== employee.user.username) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          username: newUsername,
          id: { not: employee.userId },
          deletedAt: null
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
          outletId: outletId !== undefined ? (outletId || null) : employee.outletId,
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

    const updatedEmployee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { include: { role: true } } }
    });

    if (updatedEmployee) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE_EMPLOYEE',
          entity: 'Employee',
          entityId: id,
          details: JSON.stringify({
            username: updatedEmployee.user.username,
            name: `${updatedEmployee.firstName} ${updatedEmployee.lastName || ''}`.trim(),
            status: updatedEmployee.status,
            role: updatedEmployee.user.role.name,
            outletId: updatedEmployee.outletId
          }),
          ipAddress: req.ip || null
        }
      });
    }

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
    
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { include: { role: true } } }
    });
    
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const currentUserRole = req.user?.role?.name || req.user?.role;
    const targetEmployeeRole = employee.user?.role?.name;
    
    if (targetEmployeeRole === 'Owner' && currentUserRole !== 'Administrator' && currentUserRole !== 'Owner') {
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus profil Owner.' });
    }
    
    let freedUsername = '';
    // Soft delete employee and user, freeing up username for future reuse
    await prisma.$transaction(async (tx) => {
      const deletedEmp = await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { user: true }
      });

      freedUsername = `${deletedEmp.user.username}_deleted_${Date.now()}`;
      await tx.user.update({
        where: { id: deletedEmp.userId },
        data: {
          deletedAt: new Date(),
          username: freedUsername
        }
      });
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_EMPLOYEE',
        entity: 'Employee',
        entityId: id,
        details: JSON.stringify({
          id,
          username: employee.user.username,
          name: `${employee.firstName} ${employee.lastName || ''}`.trim(),
          freedUsername
        }),
        ipAddress: req.ip || null
      }
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

export const importEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: 'Data karyawan kosong atau tidak valid.' });
    }

    const karyawanRole = await prisma.role.findFirst({
      where: { name: 'Karyawan', deletedAt: null }
    });

    if (!karyawanRole) {
      return res.status(500).json({ message: 'Role Karyawan tidak ditemukan dalam sistem.' });
    }

    const [allShifts, allOutlets, allRoles] = await Promise.all([
      prisma.workShift.findMany({ where: { deletedAt: null } }),
      prisma.outlet.findMany({ where: { deletedAt: null } }),
      prisma.role.findMany({ where: { deletedAt: null } })
    ]);

    const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

    const shiftMap = new Map(allShifts.map((s) => [s.name.toLowerCase().trim(), s.id]));
    const roleMap = new Map(allRoles.map((r) => [r.name.toLowerCase().trim(), r.id]));
    const defaultRoleId = roleMap.get('karyawan') || karyawanRole.id;

    const results = await prisma.$transaction(async (tx) => {
      const createdEmployees = [];
      const skippedUsernames = [];

      for (const empData of employees) {
        const rawUsername = empData.username?.toString().trim();
        if (!rawUsername) continue;

        const existingUser = await tx.user.findFirst({
          where: { username: rawUsername, deletedAt: null }
        });

        if (existingUser) {
          skippedUsernames.push(rawUsername);
          continue;
        }

        const passwordText = empData.password?.toString().trim() || '123456';
        let hashedPassword;
        const isBcrypt = /^\$2[a-z0-9]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(passwordText);
        if (isBcrypt) {
          hashedPassword = passwordText;
        } else {
          hashedPassword = await bcrypt.hash(passwordText, 10);
        }

        let shiftId = null;
        if (empData.shiftName) {
          const cleanShiftName = empData.shiftName.toString().toLowerCase().trim();
          shiftId = shiftMap.get(cleanShiftName) || null;
        }

        let outletId = null;
        if (empData.outletName) {
          const cleanOutletName = empData.outletName.toString().toLowerCase().trim();
          const normalizedInputOutlet = normalizeText(cleanOutletName);
          
          if (normalizedInputOutlet && normalizedInputOutlet !== '-') {
            const matchedOutlet = allOutlets.find(o => {
              const normalizedName = normalizeText(o.name);
              const normalizedCode = normalizeText(o.code);
              return normalizedName === normalizedInputOutlet || 
                     normalizedName.includes(normalizedInputOutlet) ||
                     normalizedInputOutlet.includes(normalizedName) ||
                     normalizedCode === normalizedInputOutlet ||
                     normalizedInputOutlet.includes(normalizedCode);
            });
            if (matchedOutlet) {
              outletId = matchedOutlet.id;
            }
          }
        }

        if (!outletId && allOutlets.length > 0) {
          outletId = allOutlets[0].id;
        }

        let roleId = defaultRoleId;
        if (empData.roleName) {
          const cleanRoleName = empData.roleName.toString().toLowerCase().trim();
          const normalizedInputRole = normalizeText(cleanRoleName);
          
          const matchedRole = allRoles.find(r => {
            const normalizedRoleName = normalizeText(r.name);
            return normalizedRoleName === normalizedInputRole || 
                   normalizedRoleName.includes(normalizedInputRole) || 
                   normalizedInputRole.includes(normalizedRoleName);
          });
          if (matchedRole) {
            roleId = matchedRole.id;
          }
        }

        const user = await tx.user.create({
          data: {
            username: rawUsername,
            password: hashedPassword,
            roleId
          }
        });

        let joinDate = null;
        if (empData.joinDate) {
          const parsed = new Date(empData.joinDate);
          if (!isNaN(parsed.getTime())) {
            joinDate = parsed;
          }
        }

        let firstName = empData.firstName?.toString().trim() || rawUsername;
        let lastName = empData.lastName?.toString().trim() || null;

        if (firstName && !lastName) {
          const parts = firstName.split(/\s+/);
          if (parts.length > 1) {
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }
        }

        let gender = null;
        if (empData.gender) {
          const g = empData.gender.toString().toLowerCase().trim();
          if (g.startsWith('l') || g === 'laki-laki' || g === 'laki laki') {
            gender = 'L';
          } else if (g.startsWith('p') || g === 'perempuan') {
            gender = 'P';
          }
        }

        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            phone: empData.phone?.toString().trim() || null,
            address: empData.address?.toString().trim() || null,
            gender,
            status: empData.status?.toString().trim() || 'ACTIVE',
            shiftId,
            outletId,
            joinDate,
            baseSalary: empData.baseSalary ? parseFloat(empData.baseSalary) : null
          }
        });

        createdEmployees.push(employee);
      }

      return { createdCount: createdEmployees.length, skipped: skippedUsernames };
    });

    res.json({
      message: `Berhasil mengimpor ${results.createdCount} karyawan.`,
      createdCount: results.createdCount,
      skippedCount: results.skipped.length,
      skippedUsernames: results.skipped
    });
  } catch (error: any) {
    console.error('Import Employees Error:', error);
    res.status(500).json({ message: error?.message || 'Gagal mengimpor data karyawan.' });
  }
};