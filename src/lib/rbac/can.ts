import { SUPER_ADMIN_ROLE } from "./roles";
import type { PermissionName } from "./permissions";

export interface RbacUser {
  id: string;
  email?: string | null;
  name?: string | null;
  roles: string[];
  permissions: string[];
}

/**
 * Pure permission check. No side effects, no server imports.
 * Returns true if the user has the given permission (or is ADMIN).
 */
export function can(
  user: RbacUser | null | undefined,
  permission: PermissionName
): boolean {
  if (!user) return false;
  if (user.roles?.includes(SUPER_ADMIN_ROLE)) return true;
  return user.permissions?.includes(permission) ?? false;
}
