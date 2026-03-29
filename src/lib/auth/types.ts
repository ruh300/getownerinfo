import { userRoles, type UserRole } from "@/lib/domain";

export type AuthUser = {
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
};

export type AuthSession = {
  user: AuthUser;
  issuedAt: string;
  expiresAt: string;
};

export const listingEditorRoles: UserRole[] = ["owner", "manager", "admin"];
export const adminRoles: UserRole[] = ["admin", "manager"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function canCreateListings(role: UserRole) {
  return listingEditorRoles.includes(role);
}

export function canAccessAdmin(role: UserRole) {
  return adminRoles.includes(role);
}

export function canConfigureFees(role: UserRole) {
  return role === "admin";
}

export function getDefaultRedirectForRole(role: UserRole) {
  return canAccessAdmin(role) ? "/admin" : "/dashboard";
}
