import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ResourceWhereInput = Prisma.ResourceWhereInput;
export type ResourceCreateInput = Prisma.ResourceCreateInput;
export type ResourceUpdateInput = Prisma.ResourceUpdateInput;

export type GetResourcesParams = {
    page?: number;
    pageSize?: number;
    search?: string;
};

export async function getResources({
    page = 1,
    pageSize = 10,
    search = "",
}: GetResourcesParams) {
    const skip = (page - 1) * pageSize;

    const where: ResourceWhereInput = search
        ? {
            OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { role: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
            ],
        }
        : {};

    const [resources, total] = await Promise.all([
        prisma.resource.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { email: true, name: true }
                },
                role: true,
            }
        }),
        prisma.resource.count({ where }),
    ]);

    return {
        resources,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getResourceById(id: string) {
    return prisma.resource.findUnique({
        where: { id },
        include: {
            user: true,
            role: true,
        }
    });
}

export async function createResource(data: ResourceCreateInput) {
    // Validate uniqueness of userId is enforced by schema (@unique), but we can double check or let Prisma throw.
    // Also validate User is active?
    const user = await prisma.user.findUnique({
        where: { id: data.user.connect?.id },
    });

    if (!user) {
        throw new Error("User not found");
    }

    if (!user.isActive) {
        throw new Error("User must be active to be a resource");
    }

    return prisma.resource.create({
        data,
    });
}

export async function updateResource(id: string, data: ResourceUpdateInput) {
    return prisma.resource.update({
        where: { id },
        data,
    });
}

export async function toggleResourceStatus(id: string, isActive: boolean) {
    return prisma.resource.update({
        where: { id },
        data: { active: isActive }, // Schema says 'active', not 'isActive'. Check schema.
    });
}

export async function getEligibleUsers() {
    // Fetch users who are active AND do not have a resource record
    return prisma.user.findMany({
        where: {
            isActive: true,
            resource: {
                is: null
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
        },
        orderBy: { name: 'asc' }
    });
}

export async function getResourceRoles() {
    return prisma.resourceRole.findMany({
        orderBy: { name: 'asc' }
    });
}
