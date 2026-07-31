import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
const publicProfileSelect = {
    id: true,
    username: true,
    role: { select: { name: true } },
    employee: {
        select: {
            firstName: true,
            lastName: true,
            phone: true,
        },
    },
};
export const login = async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const user = await prisma.user.findUnique({
            where: { username: username.trim() },
            include: { role: true },
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const expiresIn = rememberMe ? '30d' : '1d';
        const token = jwt.sign({ id: user.id, role: user.role.name }, process.env.JWT_SECRET || 'secret', { expiresIn });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role.name,
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const profile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                role: {
                    include: { permissions: true }
                },
                employee: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                }
            }
        });
        if (!user)
            return res.status(404).json({ message: 'Akun tidak ditemukan.' });
        const permissions = req.user?.permissions || user.role.permissions.map(p => p.permissionId);
        res.json({
            id: user.id,
            username: user.username,
            role: user.role.name,
            employee: user.employee,
            permissions
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { username: true }
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Akun tidak ditemukan.' });
        }
        const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
        const userUpdateData = {};
        if (username && username !== currentUser.username) {
            const isAdmin = req.user?.role?.name === 'Administrator';
            const canEditUser = isAdmin || (Array.isArray(req.user?.permissions) && req.user.permissions.includes('user_management.edit_user'));
            if (!canEditUser) {
                return res.status(403).json({ message: 'Username hanya dapat diubah oleh pengguna dengan izin user_management.edit_user.' });
            }
            const duplicate = await prisma.user.findFirst({
                where: {
                    id: { not: req.user.id },
                    username,
                },
                select: { username: true },
            });
            if (duplicate) {
                return res.status(409).json({ message: 'Username sudah digunakan oleh akun lain.' });
            }
            userUpdateData.username = username;
        }
        const employeeUpdate = {};
        if (typeof req.body.name === 'string') {
            const nameInput = req.body.name.trim();
            if (!nameInput) {
                return res.status(400).json({ message: 'Nama wajib diisi.' });
            }
            const parts = nameInput.split(/\s+/);
            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ');
            employeeUpdate.firstName = firstName;
            employeeUpdate.lastName = lastName || null;
        }
        if (typeof req.body.phone === 'string') {
            employeeUpdate.phone = req.body.phone.trim() || null;
        }
        if (Object.keys(employeeUpdate).length > 0) {
            const existingEmployee = await prisma.employee.findUnique({
                where: { userId: req.user.id }
            });
            if (existingEmployee) {
                userUpdateData.employee = {
                    update: employeeUpdate
                };
            }
            else {
                userUpdateData.employee = {
                    create: {
                        ...employeeUpdate,
                        status: 'ACTIVE'
                    }
                };
            }
        }
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: userUpdateData,
            select: publicProfileSelect,
        });
        return res.json(updatedUser);
    }
    catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'Username sudah digunakan oleh akun lain.' });
        }
        return res.status(500).json({ message: 'Profil belum dapat diperbarui. Silakan coba lagi.' });
    }
};
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== 'string' || !currentPassword) {
            return res.status(400).json({ message: 'Password saat ini wajib diisi.' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password baru minimal 8 karakter.' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'Password baru harus berbeda dari password saat ini.' });
        }
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json({ message: 'Akun tidak ditemukan.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch)
            return res.status(400).json({ message: 'Password saat ini tidak sesuai.' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password berhasil diubah.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Password belum dapat diubah. Silakan coba lagi.' });
    }
};
export const forgotPassword = async (req, res) => {
    try {
        res.json({ message: 'Password reset request process.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const setup = async (req, res) => {
    try {
        const count = await prisma.user.count();
        if (count > 0) {
            return res.status(400).json({ message: 'Setup already completed. Initial administrator already exists.' });
        }
        const { password, username } = req.body;
        const roles = ['Administrator', 'Owner', 'Staff', 'Karyawan'];
        for (const roleName of roles) {
            await prisma.role.upsert({
                where: { name: roleName },
                update: {},
                create: { name: roleName }
            });
        }
        const adminRole = await prisma.role.findUnique({ where: { name: 'Administrator' } });
        if (!adminRole)
            throw new Error('Role not found');
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                roleId: adminRole.id
            }
        });
        res.json({ message: 'Admin created successfully', user: { id: user.id, username: user.username } });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
