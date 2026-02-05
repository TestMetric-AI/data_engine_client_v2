import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ResourceRoleWhereInput = Prisma.ResourceRoleWhereInput;
export type ResourceRoleCreateInput = Prisma.ResourceRoleCreateInput;
export type ResourceRoleUpdateInput = Prisma.ResourceRoleUpdateInput;

export type GetResourceRolesParams = {
    page?: number;
    pageSize?: number;
    search?: string;
};

export async function getResourceRoles({
    page = 1,
    pageSize = 10,
    search = "",
}: GetResourceRolesParams) {
    const skip = (page - 1) * pageSize;

    const where: ResourceRoleWhereInput = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ],
        }
        : {};

    const [roles, total] = await Promise.all([
        prisma.resourceRole.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { resources: true }
                }
            }
        }),
        prisma.resourceRole.count({ where }),
    ]);

    return {
        roles,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getResourceRoleById(id: string) {
    return prisma.resourceRole.findUnique({
        where: { id },
    });
}

export async function createResourceRole(data: ResourceRoleCreateInput) {
    return prisma.resourceRole.create({
        data,
    });
}

export async function updateResourceRole(id: string, data: ResourceRoleUpdateInput) {
    return prisma.resourceRole.update({
        where: { id },
        data,
    });
}

export async function toggleResourceRoleStatus(id: string, isActive: boolean) {
    return prisma.resourceRole.update({
        where: { id },
        data: { isActive },
    });
}
