import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

