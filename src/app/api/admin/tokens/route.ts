import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET environment variable is required. Cannot start without it.");
}
const SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing required fields: email, password" }, { status: 400 });
        }

        // 1. Find User
        const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: true }
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 2. Validate Password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 3. Check for SERVICE role
        const hasServiceRole = user.roles.some(r => r.name === "SERVICE");
        if (!hasServiceRole) {
            return NextResponse.json({ error: "User must have SERVICE role to generate tokens" }, { status: 403 });
        }

        // 4. Create JWT
        const payload = {
            id: user.id,
            email: user.email,
            role: "SERVICE",
            type: "api_token"
        };

        // Fixed expiration of 1 year as requested (user choice removed)
        const token = jwt.sign(payload, SECRET, {
            expiresIn: "365d"
        });

        return NextResponse.json({
            message: "Token generated successfully",
            token
        });

    } catch (error) {
        console.error("Token generation error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
