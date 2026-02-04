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
        const roles = await prisma.role.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
        return NextResponse.json(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
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

        const existing = await prisma.role.findUnique({
            where: { name }
        });

        if (existing) {
            return NextResponse.json({ message: "Role with this name already exists" }, { status: 400 });
        }

        const role = await prisma.role.create({
            data: {
                name,
                description,
                isActive: true
            }
        });

        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        console.error("Error creating role:", error);
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

        const role = await prisma.role.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(role);
    } catch (error) {
        console.error("Error updating role:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
