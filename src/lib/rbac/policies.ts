import { can } from "./can";
import { Permission } from "./permissions";

interface RbacUser {
  id: string;
  roles: string[];
  permissions: string[];
}

interface TaskApprovalContext {
  resourceRoleName?: string | null;
}

/**
 * Check if a user can approve/reject tasks.
 * Allowed if user has TASKS_APPROVE permission OR their resource role is "LEAD".
 */
export function canApproveTask(
  user: RbacUser | null | undefined,
  context?: TaskApprovalContext
): boolean {
  if (!user) return false;
  if (can(user, Permission.TASKS_APPROVE)) return true;
  return context?.resourceRoleName === "LEAD";
}
