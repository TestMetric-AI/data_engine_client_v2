import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { notifyNewTaskCreated } from "@/lib/services/teams-webhook";

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
                    select: { fullName: true, id: true },
                },
                project: {
                    select: { name: true, id: true, code: true },
                },
                status: true,
            },
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
    const task = await prisma.$transaction(async (tx) => {
        const created = await tx.resourceTask.create({
            data,
        });

        await tx.resourceTaskStatusHistory.create({
            data: {
                taskId: created.id,
                toStatusId: created.statusId,
                changedById: authorId,
                notes: "Task created",
            },
        });

        return created;
    });

    try {
        const assignee = await prisma.resource.findUnique({
            where: { id: task.resourceId },
            select: { fullName: true, user: { select: { email: true } } },
        });

        let createdByName = "Sistema";
        if (authorId) {
            const author = await prisma.resource.findUnique({
                where: { id: authorId },
                select: { fullName: true },
            });

            if (author?.fullName) {
                createdByName = author.fullName;
            }
        }

        if (assignee?.user?.email) {
            await notifyNewTaskCreated({
                taskTitle: task.title,
                assigneeName: assignee.fullName,
                assigneeEmail: assignee.user.email,
                createdByName,
            });
        }
    } catch (err) {
        console.error("[createResourceTask] Teams notification error:", err);
    }

    return task;
}

export async function updateResourceTask(id: string, data: ResourceTaskUpdateInput, authorId?: string) {
    return prisma.$transaction(async (tx) => {
        const currentTask = await tx.resourceTask.findUnique({
            where: { id },
            select: { statusId: true },
        });

        if (!currentTask) throw new Error("Task not found");

        const updatedTask = await tx.resourceTask.update({
            where: { id },
            data,
        });

        if (updatedTask.statusId !== currentTask.statusId) {
            await tx.resourceTaskStatusHistory.create({
                data: {
                    taskId: id,
                    fromStatusId: currentTask.statusId,
                    toStatusId: updatedTask.statusId,
                    changedById: authorId,
                    notes: "Status updated",
                },
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
                orderBy: { changedAt: "desc" },
                include: {
                    fromStatus: true,
                    toStatus: true,
                    changedBy: true,
                },
            },
        },
    });
}
