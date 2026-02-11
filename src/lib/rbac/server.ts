import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { can, type RbacUser } from "./can";
import type { PermissionName } from "./permissions";

/**
 * Server-side permission check. Returns the user if authorized, null otherwise.
 */
export async function canServer(
  permission: PermissionName
): Promise<RbacUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as RbacUser | undefined;
  if (!user) return null;
  return can(user, permission) ? user : null;
}

/**
 * Server-side permission guard for pages/layouts.
 * Redirects to /login (no session) or / (no permission).
 * Returns the user on success.
 */
export async function requireServer(
  permission: PermissionName
): Promise<RbacUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as RbacUser | undefined;

  if (!user) {
    redirect("/login");
  }

  if (!can(user, permission)) {
    console.warn(
      `User ${user.email} attempted to access protected route without permission: ${permission}`
    );
    redirect("/");
  }

  return user;
}

/**
 * API route permission guard.
 * Returns `{ user }` on success or `{ error: NextResponse }` on failure.
 */
export async function requireApi(
  permission: PermissionName
): Promise<{ user: RbacUser } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  const user = session?.user as RbacUser | undefined;

  if (!user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!can(user, permission)) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}
