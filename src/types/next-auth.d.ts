import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import type { PermissionName } from "@/lib/rbac/permissions";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            roles: string[];
            permissions: PermissionName[];
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        roles: string[];
        permissions: PermissionName[];
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        roles: string[];
        permissions: PermissionName[];
    }
}
