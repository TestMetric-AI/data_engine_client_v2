import { Permission, type PermissionName } from "./permissions";

export const RolePermissions: Record<string, PermissionName[]> = {
  ADMIN: Object.values(Permission),
  MANAGER: [
    Permission.MANAGEMENT_VIEW,
    Permission.USERS_MANAGE,
    Permission.PROJECTS_MANAGE,
    Permission.RESOURCES_MANAGE,
    Permission.TASKS_MANAGE,
    Permission.TASKS_APPROVE,
  ],
  LEAD: [
    Permission.MANAGEMENT_VIEW,
    Permission.TASKS_MANAGE,
    Permission.TASKS_APPROVE,
  ],
  USER: [
    Permission.MANAGEMENT_VIEW,
  ],
};

export const SUPER_ADMIN_ROLE = "ADMIN";
