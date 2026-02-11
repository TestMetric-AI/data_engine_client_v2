"use client";

import { useSession } from "next-auth/react";
import { can } from "@/lib/rbac/can";
import { canApproveTask } from "@/lib/rbac/policies";
import type { PermissionName } from "@/lib/rbac/permissions";

export function useCan() {
  const { data: session, status } = useSession();

  const user = session?.user as
    | { id: string; roles: string[]; permissions: string[] }
    | undefined;

  return {
    can: (permission: PermissionName) => can(user ?? null, permission),
    canAny: (...perms: PermissionName[]) =>
      perms.some((p) => can(user ?? null, p)),
    canApproveTask: (ctx?: { resourceRoleName?: string | null }) =>
      canApproveTask(user ?? null, ctx),
    user,
    loading: status === "loading",
  };
}
