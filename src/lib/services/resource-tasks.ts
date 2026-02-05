import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ResourceTaskCreateInput = Prisma.ResourceTaskCreateInput;
export type ResourceTaskUpdateInput = Prisma.ResourceTaskUpdateInput;

export type GetResourceTasksParams = {
    resourceId?: string;
    projectId?: string;
    statusId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
};

export async function getResourceTasks({
    resourceId,
    projectId,
    statusId,
    search,
    page = 1,
    pageSize = 10,
}: GetResourceTasksParams) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ResourceTaskWhereInput = {
        resourceId,
        projectId,
        statusId,
    };

    if (search) {
        where.title = { contains: search, mode: "insensitive" };
    }

    const [tasks, total] = await Promise.all([
        prisma.resourceTask.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { updatedAt: "desc" },
            include: {
                resource: {
                    select: { fullName: true, id: true }
                },
                project: {
                    select: { name: true, id: true, code: true }
                },
                status: true,
            }
        }),
        prisma.resourceTask.count({ where }),
    ]);

    return {
        tasks,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function createResourceTask(data: ResourceTaskCreateInput, authorId?: string) {
    // We need to create the task AND the initial history entry.
    // Prisma transaction is best here.

    return prisma.$transaction(async (tx) => {
        const task = await tx.resourceTask.create({
            data,
        });

        // Create initial history
        await tx.resourceTaskStatusHistory.create({
            data: {
                taskId: task.id,
                toStatusId: task.statusId, // Initial status
                changedById: authorId,
                notes: "Task created",
            }
        });

        return task;
    });
}

export async function updateResourceTask(id: string, data: ResourceTaskUpdateInput, authorId?: string) {
    return prisma.$transaction(async (tx) => {
        // 1. Fetch current task INSIDE transaction to ensure lock/consistency
        const currentTask = await tx.resourceTask.findUnique({
            where: { id },
            select: { statusId: true }
        });

        if (!currentTask) throw new Error("Task not found");

        // 2. Perform update
        const updatedTask = await tx.resourceTask.update({
            where: { id },
            data,
        });

        // 3. Check for Status Change
        // Compare the old statusId with the new one.
        // We look at the Resulting task's statusId vs the Old one.
        if (updatedTask.statusId !== currentTask.statusId) {
            await tx.resourceTaskStatusHistory.create({
                data: {
                    taskId: id,
                    fromStatusId: currentTask.statusId,
                    toStatusId: updatedTask.statusId,
                    changedById: authorId,
                    notes: "Status updated",
                }
            });
        }

        return updatedTask;
    });
}

export async function deleteResourceTask(id: string) {
    return prisma.resourceTask.delete({
        where: { id },
    });
}

export async function getResourceTaskById(id: string) {
    return prisma.resourceTask.findUnique({
        where: { id },
        include: {
            resource: true,
            project: true,
            status: true,
            statusHistory: {
                orderBy: { changedAt: 'desc' },
                include: {
                    fromStatus: true,
                    toStatus: true,
                    changedBy: true,
                }
            }
        }
    });
}
