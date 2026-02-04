import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.string().default("user"),
});

function generatePassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

export async function POST(req: NextRequest) {
    try {
        // 1. Check session and admin role
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.roles.includes("ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 2. Parse body
        const body = await req.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 400 });
        }

        const { email, name, role } = result.data;

        // 3. Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        // 4. Create user with generated password
        const generatedPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                roles: {
                    connectOrCreate: {
                        where: { name: role },
                        create: { name: role },
                    },
                },
            },
        });

        return NextResponse.json(
            {
                message: "User created successfully",
                userId: user.id,
                generatedPassword: generatedPassword
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
