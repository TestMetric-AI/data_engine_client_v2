export const Permission = {
  MANAGEMENT_VIEW:   "VIEW_MANAGEMENT",
  USERS_MANAGE:      "MANAGE_USERS",
  PROJECTS_MANAGE:   "MANAGE_PROJECTS",
  RESOURCES_MANAGE:  "MANAGE_RESOURCES",
  TASKS_MANAGE:      "MANAGE_TASKS",
  TASKS_APPROVE:     "APPROVE_TASKS",
  ADMIN_ROLES:       "ADMIN_ROLES",
  ADMIN_USERS:       "ADMIN_USERS",
} as const;

export type PermissionName = (typeof Permission)[keyof typeof Permission];
export const ALL_PERMISSIONS: PermissionName[] = Object.values(Permission);
