import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { PermissionName } from "@/lib/rbac/permissions";

const SUPER_ADMIN_ROLE = "ADMIN";

const ROUTE_PERMISSIONS: [string, PermissionName][] = [
    ["/admin/users", "ADMIN_USERS"],
    ["/admin/roles", "ADMIN_ROLES"],
    ["/management/resources", "MANAGE_RESOURCES"],
    ["/management/resource-roles", "MANAGE_RESOURCES"],
    ["/management/projects", "MANAGE_PROJECTS"],
    ["/management", "VIEW_MANAGEMENT"],
];

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;

        if (token) {
            const pathname = req.nextUrl.pathname;

            // Check route-level permissions
            for (const [route, permission] of ROUTE_PERMISSIONS) {
                if (pathname.startsWith(route)) {
                    const roles = (token.roles as string[]) || [];
                    const permissions = (token.permissions as string[]) || [];

                    // ADMIN bypass
                    if (roles.includes(SUPER_ADMIN_ROLE)) break;

                    if (!permissions.includes(permission)) {
                        return NextResponse.redirect(new URL("/", req.url));
                    }
                    break;
                }
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                const protectedPaths = ["/dashboard", "/datasets", "/pipelines", "/admin", "/management", "/test-information"];
                const isProtected = protectedPaths.some((path) =>
                    req.nextUrl.pathname.startsWith(path)
                );

                if (isProtected) {
                    return token !== null;
                }
                return true;
            },
        },
        pages: {
            signIn: "/login",
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/datasets/:path*",
        "/pipelines/:path*",
        "/admin/:path*",
        "/management/:path*",
        "/test-information/:path*",
    ],
};
