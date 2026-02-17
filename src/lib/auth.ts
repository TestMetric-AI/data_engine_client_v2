import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./db";
import { sessionLogger } from "./session-logger";
import type { PermissionName } from "./rbac/permissions";

// Token duration configuration (in seconds)
const ACCESS_TOKEN_EXPIRES = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES || "900"); // 15 minutes
const REFRESH_TOKEN_EXPIRES = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES || "1209600"); // 14 days
const IDLE_TIMEOUT = parseInt(process.env.JWT_IDLE_TIMEOUT || "1800"); // 30 minutes

export const authOptions: NextAuthOptions = {
    // @ts-expect-error — @next-auth/prisma-adapter v1 types target Prisma 4/5; safe at runtime with Prisma 7
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: REFRESH_TOKEN_EXPIRES, // Maximum session duration (14 days)
        updateAge: ACCESS_TOKEN_EXPIRES, // Update session every 15 minutes
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                    include: {
                        roles: {
                            include: {
                                permissions: true
                            }
                        },
                    },
                });

                if (!user) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                // Filter active roles
                const activeRoles = user.roles.filter(role => role.isActive);

                // Flatten permissions from all active roles
                const allPermissions = Array.from(
                    new Set(activeRoles.flatMap((role) => role.permissions.map((p) => p.name)))
                ) as PermissionName[];

                const userPayload = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: activeRoles.map((role) => role.name),
                    permissions: allPermissions,
                };

                // Log successful login
                sessionLogger.logLogin(user.id, user.email, {
                    roles: userPayload.roles,
                    permissions: allPermissions,
                });

                return userPayload;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            // If the JWT was marked as expired, invalidate the session
            if (token?.error === "SessionExpired") {
                return { ...session, user: undefined, expires: new Date(0).toISOString() };
            }

            if (token && session.user) {
                session.user.id = token.id;
                session.user.roles = token.roles;
                session.user.permissions = token.permissions;
            }
            return session;
        },
        async jwt({ token, user, trigger }) {
            const now = Math.floor(Date.now() / 1000);

            // Initial login
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
                token.permissions = user.permissions;
                token.accessTokenExpires = now + ACCESS_TOKEN_EXPIRES; // 15 minutes from now
                token.refreshTokenExpires = now + REFRESH_TOKEN_EXPIRES; // 14 days from now
                token.lastActivity = now;
                return token;
            }

            // Check if refresh token has expired (14 days)
            if (token.refreshTokenExpires && now > (token.refreshTokenExpires as number)) {
                // Log refresh token expiration
                sessionLogger.logRefreshTokenExpired(
                    token.id as string,
                    token.email as string,
                    "14 days"
                );
                // Mark token as expired — session callback will clear the session
                token.error = "SessionExpired";
                return token;
            }

            // Check idle timeout (30 minutes of inactivity)
            if (token.lastActivity && now - (token.lastActivity as number) > IDLE_TIMEOUT) {
                const inactiveMinutes = Math.floor((now - (token.lastActivity as number)) / 60);
                // Log idle timeout
                sessionLogger.logIdleTimeout(
                    token.id as string,
                    token.email as string,
                    inactiveMinutes
                );
                // Mark token as expired — session callback will clear the session
                token.error = "SessionExpired";
                return token;
            }

            // Check if access token needs refresh (15 minutes)
            if (token.accessTokenExpires && now > (token.accessTokenExpires as number)) {
                // Access token expired, refresh it
                token.accessTokenExpires = now + ACCESS_TOKEN_EXPIRES;
                // Log token refresh
                sessionLogger.logTokenRefresh(
                    token.id as string,
                    token.email as string,
                    token.accessTokenExpires as number
                );
            }

            // Update last activity on any token update
            if (trigger === "update") {
                token.lastActivity = now;
            }

            return token;
        },
    },
};
