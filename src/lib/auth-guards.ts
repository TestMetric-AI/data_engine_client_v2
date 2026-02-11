import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import {
    requireServer as rbacRequireServer,
    canServer as rbacCanServer,
} from "./rbac";
import type { PermissionName } from "./rbac";

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

/**
 * @deprecated Use `requireServer()` from `@/lib/rbac` instead.
 */
export async function requirePermission(permission: PermissionName) {
    return rbacRequireServer(permission);
}

/**
 * @deprecated Use `canServer()` from `@/lib/rbac` instead.
 */
export async function hasPermission(permission: PermissionName) {
    const user = await rbacCanServer(permission);
    return user !== null;
}
