import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
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
const DEFAULT_PERMISSIONS = {
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
export async function seedDatabase() {
    console.log('🌱 Starting fresh database seed...');
    // 1. Ensure Roles & RolePermissions exist
    const rolesMap = {};
    for (const roleName of REQUIRED_ROLE_NAMES) {
        let role = await prisma.role.findUnique({ where: { name: roleName }, include: { permissions: true } });
        if (!role) {
            role = await prisma.role.create({
                data: {
                    name: roleName,
                    description: `Role ${roleName} sistem`
                },
                include: { permissions: true }
            });
            if (DEFAULT_PERMISSIONS[roleName]) {
                await prisma.rolePermission.createMany({
                    data: DEFAULT_PERMISSIONS[roleName].map(pId => ({
                        roleId: role.id,
                        permissionId: pId
                    }))
                });
            }
        }
        rolesMap[roleName] = role;
    }
    // 2. Ensure initial Admin user exists
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    let adminUser = await prisma.user.findUnique({
        where: { username: adminUsername },
        include: { employee: true }
    });
    if (!adminUser) {
        const adminRole = rolesMap['Administrator'] || await prisma.role.findUnique({ where: { name: 'Administrator' } });
        if (!adminRole) {
            throw new Error('Administrator role missing during seed');
        }
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        adminUser = await prisma.user.create({
            data: {
                username: adminUsername,
                password: hashedPassword,
                roleId: adminRole.id,
                employee: {
                    create: {
                        firstName: 'Admin',
                        lastName: 'System',
                        status: 'ACTIVE',
                    }
                }
            },
            include: { employee: true }
        });
        console.log(`✅ Default Administrator user created:`);
        console.log(`   Username: ${adminUsername}`);
        console.log(`   Password: ${adminPassword}`);
    }
    else {
        console.log(`ℹ️ Admin user (${adminUsername}) already exists.`);
    }
    // 2b. Ensure initial Owner user exists
    const ownerUsername = process.env.INITIAL_OWNER_USERNAME || 'owner';
    const ownerPassword = process.env.INITIAL_OWNER_PASSWORD || 'owner123';
    let ownerUser = await prisma.user.findUnique({
        where: { username: ownerUsername },
        include: { employee: true }
    });
    if (!ownerUser) {
        const ownerRole = rolesMap['Owner'] || await prisma.role.findUnique({ where: { name: 'Owner' } });
        if (ownerRole) {
            const hashedPassword = await bcrypt.hash(ownerPassword, 10);
            ownerUser = await prisma.user.create({
                data: {
                    username: ownerUsername,
                    password: hashedPassword,
                    roleId: ownerRole.id,
                    employee: {
                        create: {
                            firstName: 'Owner',
                            lastName: 'Kopi Selon',
                            status: 'ACTIVE',
                        }
                    }
                },
                include: { employee: true }
            });
            console.log(`✅ Default Owner user created:`);
            console.log(`   Username: ${ownerUsername}`);
            console.log(`   Password: ${ownerPassword}`);
        }
    }
    // 3. Ensure Default Company Profile exists
    const companyProfileCount = await prisma.companyProfile.count();
    if (companyProfileCount === 0) {
        await prisma.companyProfile.create({
            data: {
                name: 'Kopi Selon',
                address: 'Jl. Kopi Selon No. 1',
                phone: '08123456789',
                email: 'info@kopiselon.com',
                about: 'Kopi Selon Employee Management System',
                hours: '08:00 - 22:00'
            }
        });
        console.log('✅ Default Company Profile created.');
    }
    // 4. Ensure Default Salary Rules exist
    const salaryRuleCount = await prisma.salaryRule.count();
    if (salaryRuleCount === 0) {
        await prisma.salaryRule.create({
            data: {
                absentDeduction: 50000,
                lateDeductionPerMinute: 1000,
                underworkDeductionPerHour: 10000,
                overtimeBonusPerHour: 15000,
                isActive: true
            }
        });
        console.log('✅ Default Salary Rule created.');
    }
    // 5. Ensure Default Location Setting exists
    const locationSettingCount = await prisma.locationSetting.count();
    if (locationSettingCount === 0) {
        await prisma.locationSetting.create({
            data: {
                name: 'Kantor Utama Kopi Selon',
                latitude: -6.200000,
                longitude: 106.816666,
                radius: 100
            }
        });
        console.log('✅ Default Location Setting created.');
    }
    console.log('🎉 Database seed completed successfully!');
}
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
    seedDatabase()
        .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
