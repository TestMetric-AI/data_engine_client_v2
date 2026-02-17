import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET environment variable is required. Cannot start without it.");
}
const SECRET = process.env.NEXTAUTH_SECRET;

/**
 * Verifies if the request is authenticated via User Session or API Token (JWT).
 * Returns true if authenticated, false otherwise.
 * Throws error if validation fails in a manageable way, but ideally returns boolean.
 */
export async function verifyApiAuth(req: NextRequest): Promise<boolean> {
    // 1. Check for Browser Session
    const session = await getServerSession(authOptions);
    if (session?.user) {
        return true;
    }

    // 2. Check for Bearer Token
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            // Verify JWT
            jwt.verify(token, SECRET);
            return true;
        } catch (error) {
            console.error("API Token Validation Failed:", error);
            // Token invalid or expired
            return false;
        }
    }

    // Not authenticated
    return false;
}
