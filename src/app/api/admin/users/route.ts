import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    role: z.string().default("user"),
});

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

        const { email, password, name, role } = result.data;

        // 3. Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        // 4. Create user
        const hashedPassword = await bcrypt.hash(password, 10);

        // Ensure role exists or create it (optional safety, better to seed)
        // For now assuming roles exist as per schema, but we can verify.
        // Actually, Prisma create with connectOrCreate is safer.

        // We need to fetch the role first to be sure or use connectOrCreate
        // Let's assume seeded roles for simplicity and robust design usually relies on seeds.
        // However, for this task I will use connectOrCreate to be safe.

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
            { message: "User created successfully", userId: user.id },
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
