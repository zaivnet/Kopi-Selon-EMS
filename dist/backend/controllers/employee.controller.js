import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { HIDDEN_ROLES } from '../lib/constants.js';
const STAFF_ASSIGNABLE_ROLES = ['Karyawan'];
export const getMyEmployeeProfile = async (req, res) => {
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
        if (!employee)
            return res.status(404).json({ message: 'Profil karyawan tidak ditemukan.' });
        res.json(employee);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const getEmployees = async (req, res) => {
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
                    role: { name: { notIn: HIDDEN_ROLES } }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(employees);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const getEmployee = async (req, res) => {
    try {
        const id = req.params.id;
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
        if (!employee)
            return res.status(404).json({ message: 'Employee not found' });
        res.json(employee);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const createEmployee = async (req, res) => {
    try {
        const { name, firstName: reqFirstName, lastName: reqLastName, username, password, roleId, gender, phone, address, status, shiftId, joinDate, baseSalary } = req.body;
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
        if (currentUserRole === 'Staff') {
            const selectedRole = await prisma.role.findUnique({ where: { id: roleId } });
            if (selectedRole && !STAFF_ASSIGNABLE_ROLES.includes(selectedRole.name)) {
                return res.status(403).json({ message: 'Staff hanya boleh menetapkan role Staff atau Karyawan.' });
            }
        }
        // Check if username exists among active users
        const existingUser = await prisma.user.findFirst({
            where: { username: username.trim(), deletedAt: null }
        });
        if (existingUser)
            return res.status(400).json({ message: 'Username sudah digunakan' });
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
    }
    catch (error) {
        console.error('Create Employee Error:', error);
        if (error?.code === 'P2002') {
            return res.status(400).json({ message: 'Username sudah digunakan' });
        }
        res.status(500).json({ message: error?.message || 'Internal server error' });
    }
};
export const updateEmployee = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, firstName: reqFirstName, lastName: reqLastName, username: reqUsername, password: reqPassword, gender, phone, address, status, shiftId, joinDate, baseSalary, roleId } = req.body;
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: { user: true }
        });
        if (!employee)
            return res.status(404).json({ message: 'Employee not found' });
        const currentUserRole = req.user?.role?.name || req.user?.role;
        if (roleId && roleId !== employee.user.roleId && currentUserRole === 'Staff') {
            const selectedRole = await prisma.role.findUnique({ where: { id: roleId } });
            if (selectedRole && !STAFF_ASSIGNABLE_ROLES.includes(selectedRole.name)) {
                return res.status(403).json({ message: 'Staff hanya boleh menetapkan role Staff atau Karyawan.' });
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
                    joinDate: joinDate ? new Date(joinDate) : employee.joinDate,
                    baseSalary: baseSalary !== undefined
                        ? ((parsedSalary !== null && !isNaN(parsedSalary)) ? parsedSalary : null)
                        : employee.baseSalary,
                }
            });
            const userUpdateData = {};
            if (newUsername && newUsername !== employee.user.username) {
                userUpdateData.username = newUsername;
            }
            if (roleId && roleId !== employee.user.roleId) {
                const currentUserRole = req.user?.role?.name || req.user?.role;
                if (currentUserRole === 'Staff') {
                    const selectedRole = await tx.role.findUnique({ where: { id: roleId } });
                    if (selectedRole && !STAFF_ASSIGNABLE_ROLES.includes(selectedRole.name)) {
                        throw new Error('Staff hanya boleh menetapkan role Staff atau Karyawan.');
                    }
                }
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
    }
    catch (error) {
        console.error('Update Employee Error:', error);
        if (error?.code === 'P2002') {
            return res.status(400).json({ message: 'Username atau data sudah terdaftar' });
        }
        res.status(500).json({ message: error?.message || 'Internal server error' });
    }
};
export const deleteEmployee = async (req, res) => {
    try {
        const id = req.params.id;
        // Soft delete employee and user, freeing up username for future reuse
        await prisma.$transaction(async (tx) => {
            const employee = await tx.employee.update({
                where: { id },
                data: { deletedAt: new Date() },
                include: { user: true }
            });
            const freedUsername = `${employee.user.username}_deleted_${Date.now()}`;
            await tx.user.update({
                where: { id: employee.userId },
                data: {
                    deletedAt: new Date(),
                    username: freedUsername
                }
            });
        });
        res.json({ message: 'Employee deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const resetPassword = async (req, res) => {
    try {
        const id = req.params.id;
        const { newPassword } = req.body;
        const employee = await prisma.employee.findUnique({ where: { id } });
        if (!employee)
            return res.status(404).json({ message: 'Employee not found' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: employee.userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const uploadPhoto = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
