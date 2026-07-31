/**
 * Roles that are hidden from employee lists, shift views,
 * attendance monitoring, payroll, and reports.
 * Administrator can control everything but must remain
 * invisible to Owner, Staff, and Karyawan.
 */
export const HIDDEN_ROLES = ['Administrator'] as const;

/**
 * Roles that are considered operational workers
 * (visible in all employee-facing views).
 */
export const WORKER_ROLES = ['Karyawan'] as const;

/**
 * Prisma filter to exclude hidden roles from any employee query.
 * Usage: where: { deletedAt: null, ...EXCLUDE_HIDDEN_ROLES }
 */
export const EXCLUDE_HIDDEN_ROLES = {
  user: {
    deletedAt: null,
    role: {
      name: { notIn: HIDDEN_ROLES as unknown as string[] }
    }
  }
} as const;

/**
 * Strict role hierarchy order:
 * 1. Admin / Administrator
 * 2. Owner
 * 3. Staff
 * 4. Karyawan
 */
export const ROLE_HIERARCHY_ORDER: Record<string, number> = {
  Administrator: 1,
  Admin: 1,
  Owner: 2,
  Staff: 3,
  Karyawan: 4
};

export function getRoleRank(roleName?: string | null): number {
  if (!roleName) return 99;
  return ROLE_HIERARCHY_ORDER[roleName] ?? 99;
}

export function sortRolesByHierarchy<T extends { name: string }>(roles: T[]): T[] {
  return [...roles].sort((a, b) => getRoleRank(a.name) - getRoleRank(b.name));
}

