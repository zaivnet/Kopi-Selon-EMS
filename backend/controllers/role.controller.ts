import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const ALL_PERMISSION_IDS = [
  'dashboard.view',
  'employee.view', 'employee.create', 'employee.edit', 'employee.delete',
  'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete', 'attendance.export',
  'shift.view', 'shift.create', 'shift.edit', 'shift.delete',
  'request_center.view', 'request_center.create', 'request_center.approve',
  'salary.view', 'salary.calculate', 'salary.approve', 'salary.export',
  'reports.view', 'reports.export', 'reports.print',
  'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
  'company_profile.view', 'company_profile.edit',
  'settings.view', 'settings.edit',
  'audit_log.view',
  'backup_restore.backup', 'backup_restore.restore',
  'user_management.create_user', 'user_management.edit_user', 'user_management.delete_user', 'user_management.reset_password'
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  Administrator: ALL_PERMISSION_IDS,
  Owner: [
    'dashboard.view', 'employee.view', 'employee.create', 'employee.edit',
    'attendance.view', 'attendance.export',
    'shift.view',
    'request_center.view', 'request_center.create', 'request_center.approve',
    'salary.view', 'salary.calculate', 'salary.approve', 'salary.export',
    'reports.view', 'reports.export', 'reports.print',
    'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
    'company_profile.view', 'company_profile.edit',
    'settings.view',
    'audit_log.view',
    'user_management.create_user', 'user_management.edit_user', 'user_management.reset_password'
  ],
  Staff: [
    'dashboard.view', 'employee.view', 'employee.create', 'employee.edit',
    'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.export',
    'shift.view', 'shift.create', 'shift.edit',
    'request_center.view', 'request_center.create', 'request_center.approve',
    'reports.view', 'reports.export',
    'announcements.view', 'announcements.create',
    'company_profile.view'
  ],
  Karyawan: [
    'dashboard.view',
    'attendance.view', 'attendance.create',
    'shift.view',
    'request_center.view', 'request_center.create',
    'salary.view',
    'announcements.view'
  ]
};

const REQUIRED_ROLE_NAMES = ['Administrator', 'Owner', 'Staff', 'Karyawan'];

async function ensureRolesExist() {
  for (const roleName of REQUIRED_ROLE_NAMES) {
    const existing = await prisma.role.findUnique({ where: { name: roleName }, include: { permissions: true } });
    if (!existing) {
      const created = await prisma.role.create({
        data: {
          name: roleName,
          description: `Role ${roleName} sistem`
        }
      });
      if (DEFAULT_PERMISSIONS[roleName]) {
        await prisma.rolePermission.createMany({
          data: DEFAULT_PERMISSIONS[roleName].map(pId => ({
            roleId: created.id,
            permissionId: pId
          }))
        });
      }
    } else if (DEFAULT_PERMISSIONS[roleName]) {
      // Auto-grant missing permissions
      const currentPerms = new Set(existing.permissions.map(p => p.permissionId));
      const missing = DEFAULT_PERMISSIONS[roleName].filter(pId => !currentPerms.has(pId));
      if (missing.length > 0) {
        await prisma.rolePermission.createMany({
          data: missing.map(pId => ({
            roleId: existing.id,
            permissionId: pId
          }))
        });
      }
    }
  }
}

export const getRoles = async (req: Request, res: Response) => {
  try {
    await ensureRolesExist();

    let roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: { permissions: true }
    });

    // Auto-seed permissions if empty for any role
    for (const role of roles) {
      if (role.permissions.length === 0 && DEFAULT_PERMISSIONS[role.name]) {
        const defaultPerms = DEFAULT_PERMISSIONS[role.name];
        await prisma.rolePermission.createMany({
          data: defaultPerms.map(pId => ({ roleId: role.id, permissionId: pId }))
        });
      }
    }

    // Refetch roles with permissions
    roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: { permissions: true }
    });

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.permissionId)
    }));

    res.json(formattedRoles);
  } catch (error) {
    console.error('getRoles Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const idOrName = req.params.id as string;
    const { permissions } = req.body; // array of permissionId strings

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array of strings' });
    }

    await ensureRolesExist();

    let role = await prisma.role.findFirst({
      where: {
        OR: [
          { id: idOrName },
          { name: idOrName }
        ],
        deletedAt: null
      }
    });

    if (!role) {
      return res.status(404).json({ message: `Role '${idOrName}' tidak ditemukan` });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing permissions for this role
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });

      // Insert new permissions
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((pId: string) => ({
            roleId: role.id,
            permissionId: pId
          }))
        });
      }
    });

    res.json({ message: `Hak akses role ${role.name} berhasil diperbarui`, permissions });
  } catch (error) {
    console.error('updateRolePermissions Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
