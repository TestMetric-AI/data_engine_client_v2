import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;

        // If user is authenticated, trigger session update to track activity
        if (token) {
            // The session callback will automatically update lastActivity
            // This happens through NextAuth's session management
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                // Protect sensitive routes
                const protectedPaths = ["/dashboard", "/datasets", "/pipelines"];
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
    matcher: ["/dashboard/:path*", "/datasets/:path*", "/pipelines/:path*"],
};
