import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ResourceTaskStatusWhereInput = Prisma.ResourceTaskStatusWhereInput;
export type ResourceTaskStatusCreateInput = Omit<Prisma.ResourceTaskStatusCreateInput, 'orderIndex'> & { orderIndex?: number };
export type ResourceTaskStatusUpdateInput = Prisma.ResourceTaskStatusUpdateInput;

export type GetResourceTaskStatusesParams = {
    search?: string;
};

export async function getResourceTaskStatuses({
    search = "",
}: GetResourceTaskStatusesParams = {}) {
    const where: ResourceTaskStatusWhereInput = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
            ],
        }
        : {};

    const statuses = await prisma.resourceTaskStatus.findMany({
        where,
        orderBy: { orderIndex: "asc" },
        include: {
            _count: {
                select: { tasks: true }
            }
        }
    });

    return statuses;
}

export async function getResourceTaskStatusById(id: string) {
    return prisma.resourceTaskStatus.findUnique({
        where: { id },
    });
}

export async function createResourceTaskStatus(data: ResourceTaskStatusCreateInput) {
    return prisma.$transaction(async (tx) => {
        // Auto-calculate orderIndex if not provided (append to end)
        if (data.orderIndex === undefined) {
            const lastStatus = await tx.resourceTaskStatus.findFirst({
                orderBy: { orderIndex: "desc" },
            });
            data.orderIndex = (lastStatus?.orderIndex ?? 0) + 1;
        }

        return tx.resourceTaskStatus.create({
            data: data as Prisma.ResourceTaskStatusCreateInput,
        });
    });
}

export async function updateResourceTaskStatus(id: string, data: ResourceTaskStatusUpdateInput) {
    return prisma.resourceTaskStatus.update({
        where: { id },
        data,
    });
}

export async function deleteResourceTaskStatus(id: string) {
    // Prevent delete if in use (Prisma Restrict should handle this on DB level, but good to check)
    // Actually schema says onDelete: Restrict for tasks.

    return prisma.resourceTaskStatus.delete({
        where: { id },
    });
}

// Helper to reorder statuses
export async function reorderResourceTaskStatuses(orderedIds: string[]) {
    // Use transaction to update all
    const updates = orderedIds.map((id, index) =>
        prisma.resourceTaskStatus.update({
            where: { id },
            data: { orderIndex: index + 1 },
        })
    );
    return prisma.$transaction(updates);
}
