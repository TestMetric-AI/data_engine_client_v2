import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type RoleWithPermissions = Prisma.RoleGetPayload<{
    include: { permissions: true; _count: { select: { users: true } } };
}>;

export async function getRoles() {
    return prisma.role.findMany({
        orderBy: { name: "asc" },
        include: {
            permissions: true,
            _count: {
                select: { users: true },
            },
        },
    });
}

export async function getAllPermissions() {
    return prisma.permission.findMany({
        orderBy: { name: "asc" },
    });
}

export async function createRole(data: Prisma.RoleCreateInput) {
    return prisma.role.create({
        data,
    });
}

export async function updateRole(
    id: string,
    data: Prisma.RoleUpdateInput,
    permissionIds?: string[] // Optional list of permission IDs to set
) {
    const updateData: Prisma.RoleUpdateInput = { ...data };

    // Handle permission updates if provided
    if (permissionIds) {
        updateData.permissions = {
            set: permissionIds.map((pid) => ({ id: pid })),
        };
    }

    return prisma.role.update({
        where: { id },
        data: updateData,
    });
}

export async function deleteRole(id: string) {
    return prisma.role.delete({
        where: { id },
    });
}
