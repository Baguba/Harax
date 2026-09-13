// Client-safe role utilities
export const ROLE_RANK: Record<string, number> = {
  STUDENT: 0,
  LECTURER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

export function hasMinRole(role: string | undefined | null, min: "LECTURER" | "ADMIN" | "SUPERADMIN"): boolean {
  return ROLE_RANK[role ?? "STUDENT"] >= ROLE_RANK[min];
}
