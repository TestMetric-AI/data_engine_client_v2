import { withAuth } from "next-auth/middleware";

export default withAuth({
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
});

export const config = {
    matcher: ["/dashboard/:path*", "/datasets/:path*", "/pipelines/:path*"],
};
