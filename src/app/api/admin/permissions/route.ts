import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Helper to check admin permission
async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.roles.includes("ADMIN")) {
        return false;
    }
    return true;
}

export async function GET(req: NextRequest) {
    if (!(await checkAdmin())) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { roles: true }
                }
            }
        });
        return NextResponse.json(permissions);
    } catch (error) {
        console.error("Error fetching permissions:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!(await checkAdmin())) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ message: "Name is required" }, { status: 400 });
        }

        const existing = await prisma.permission.findUnique({
            where: { name }
        });

        if (existing) {
            return NextResponse.json({ message: "Permission with this name already exists" }, { status: 400 });
        }

        const permission = await prisma.permission.create({
            data: {
                name,
                description,
                isActive: true
            }
        });

        return NextResponse.json(permission, { status: 201 });
    } catch (error) {
        console.error("Error creating permission:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!(await checkAdmin())) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, name, description, isActive } = body;

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;

        const permission = await prisma.permission.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(permission);
    } catch (error) {
        console.error("Error updating permission:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
