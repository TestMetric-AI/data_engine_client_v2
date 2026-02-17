import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireApi, Permission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error-handler";

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
    const auth = await requireApi(Permission.ADMIN_USERS);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json();
        const result = registerSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 400 });
        }

        const { email, name, role } = result.data;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

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
        return handleApiError(error, "registering user");
    }
}

export async function GET(req: NextRequest) {
    const auth = await requireApi(Permission.ADMIN_USERS);
    if ("error" in auth) return auth.error;

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                roles: {
                    select: {
                        name: true,
                    },
                },
                isActive: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(users);
    } catch (error) {
        return handleApiError(error, "fetching users");
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireApi(Permission.ADMIN_USERS);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json();
        const { userId, isActive, roles } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        if (roles && Array.isArray(roles)) {
            const rolesToConnect = await prisma.role.findMany({
                where: { name: { in: roles } },
                select: { id: true }
            });

            updateData.roles = {
                set: rolesToConnect.map(r => ({ id: r.id }))
            };
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { roles: true }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        return handleApiError(error, "updating user");
    }
}
