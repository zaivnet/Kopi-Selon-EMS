/**
 * Roles that are hidden from employee lists, shift views,
 * attendance monitoring, payroll, and reports.
 * Administrator can control everything but must remain
 * invisible to Owner, Staff, and Karyawan.
 */
export const HIDDEN_ROLES = ['Administrator'];
/**
 * Roles that are considered operational workers
 * (visible in all employee-facing views).
 */
export const WORKER_ROLES = ['Karyawan', 'Staff'];
/**
 * Prisma filter to exclude hidden roles from any employee query.
 * Usage: where: { deletedAt: null, ...EXCLUDE_HIDDEN_ROLES }
 */
export const EXCLUDE_HIDDEN_ROLES = {
    user: {
        deletedAt: null,
        role: {
            name: { notIn: HIDDEN_ROLES }
        }
    }
};
