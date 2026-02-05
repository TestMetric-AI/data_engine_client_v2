import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

export async function requirePermission(permission: string) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    // Super Admin Bypass
    if (user.roles.includes("ADMIN")) {
        return user;
    }

    if (!user.permissions || !user.permissions.includes(permission)) {
        // Option 1: Redirect to dashboard with error
        // redirect("/dashboard?error=Unauthorized");

        // Option 2: Render access denied (preferred for layouts via error boundary or simple return)
        // Since this is a server function often called in Layouts, throwing might trigger error.tsx
        // But simply redirecting is safer.

        // Let's create a dedicated "Access Denied" page or just redirect home.
        console.warn(`User ${user.email} attempted to access protected route without permission: ${permission}`);
        redirect("/");
    }

    return user;
}

export async function hasPermission(permission: string) {
    const user = await getCurrentUser();
    return user?.permissions.includes(permission) ?? false;
}
