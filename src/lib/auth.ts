import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./db";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma as any),
    session: {
        strategy: "jwt",
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
                );

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: activeRoles.map((role) => role.name),
                    permissions: allPermissions,
                };
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.roles = token.roles;
                session.user.permissions = token.permissions;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
                token.permissions = user.permissions;
            }
            return token;
        },
    },
};
