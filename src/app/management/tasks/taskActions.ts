"use server";

import { revalidatePath } from "next/cache";
import {
    createResourceTask,
    updateResourceTask,
    deleteResourceTask,
    ResourceTaskCreateInput,
    ResourceTaskUpdateInput,
} from "@/lib/services/resource-tasks";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireServer, canServer, Permission } from "@/lib/rbac";
import { canApproveTask } from "@/lib/rbac/policies";
import prisma from "@/lib/db";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function createTaskAction(data: ResourceTaskCreateInput): Promise<ActionResponse> {
    await requireServer(Permission.TASKS_MANAGE);

    try {
        const session = await getServerSession(authOptions);

        const user = await prisma.user.findUnique({
            where: { id: session?.user.id },
            include: { resource: true }
        });
        const authorId = user?.resource?.id;

        await createResourceTask(data, authorId);
        revalidatePath("/management/tasks");
        return { success: true, message: "Task created successfully" };
    } catch (error: any) {
        console.error("Error creating task:", error);
        return { success: false, message: "Failed to create task" };
    }
}

export async function updateTaskAction(
    id: string,
    data: ResourceTaskUpdateInput
): Promise<ActionResponse> {
    await requireServer(Permission.TASKS_MANAGE);

    try {
        const session = await getServerSession(authOptions);

        const user = await prisma.user.findUnique({
            where: { id: session?.user.id },
            include: { resource: true }
        });
        const authorId = user?.resource?.id;

        await updateResourceTask(id, data, authorId);
        revalidatePath("/management/tasks");
        return { success: true, message: "Task updated successfully" };
    } catch (error: any) {
        console.error("Error updating task:", error);
        return { success: false, message: "Failed to update task" };
    }
}

export async function deleteTaskAction(id: string): Promise<ActionResponse> {
    await requireServer(Permission.TASKS_MANAGE);

    try {
        await deleteResourceTask(id);
        revalidatePath("/management/tasks");
        return { success: true, message: "Task deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { success: false, message: "Failed to delete task" };
    }
}

async function checkApprovalPermission(): Promise<boolean> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;

    const user = session.user as { id: string; roles: string[]; permissions: string[] };

    // Check resource role for contextual policy
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { resource: { select: { role: { select: { name: true } } } } }
    });

    return canApproveTask(user, {
        resourceRoleName: dbUser?.resource?.role?.name,
    });
}

export async function approveTaskAction(id: string): Promise<ActionResponse> {
    const allowed = await checkApprovalPermission();
    if (!allowed) return { success: false, message: "Unauthorized. Requires APPROVE_TASKS permission or LEAD role." };

    try {
        const session = await getServerSession(authOptions);
        const user = await prisma.user.findUnique({
            where: { id: session?.user.id },
            include: { resource: true }
        });

        if (!user?.resource) {
            return { success: false, message: "Current user is not linked to a Resource profile." };
        }

        await prisma.resourceTask.update({
            where: { id },
            data: {
                approvalStatus: "APPROVED",
                approvedById: user.resource.id,
                approvedAt: new Date(),
            }
        });

        revalidatePath("/management/tasks");
        return { success: true, message: "Task approved successfully" };
    } catch (error: any) {
        console.error("Error approving task:", error);
        return { success: false, message: "Failed to approve task" };
    }
}

export async function rejectTaskAction(id: string): Promise<ActionResponse> {
    const allowed = await checkApprovalPermission();
    if (!allowed) return { success: false, message: "Unauthorized. Requires APPROVE_TASKS permission or LEAD role." };

    try {
        await prisma.resourceTask.update({
            where: { id },
            data: {
                approvalStatus: "REJECTED",
                approvedById: null,
                approvedAt: new Date(),
            }
        });

        revalidatePath("/management/tasks");
        return { success: true, message: "Task rejected successfully" };
    } catch (error: any) {
        console.error("Error rejecting task:", error);
        return { success: false, message: "Failed to reject task" };
    }
}

export async function completeTaskAction(id: string): Promise<ActionResponse> {
    await requireServer(Permission.TASKS_MANAGE);

    try {
        const session = await getServerSession(authOptions);
        const user = await prisma.user.findUnique({
            where: { id: session?.user.id },
            include: { resource: true, roles: { select: { name: true } } },
        });
        const authorId = user?.resource?.id;
        const isAdmin = user?.roles?.some((r: any) => r.name === "ADMIN");

        // Find the final status (highest orderIndex)
        const finalStatus = await prisma.resourceTaskStatus.findFirst({
            orderBy: { orderIndex: "desc" },
        });

        if (!finalStatus) {
            return { success: false, message: "No task statuses configured. Cannot complete task." };
        }

        // Transition inside a transaction with history tracking
        const txResult = await prisma.$transaction(async (tx) => {
            const currentTask = await tx.resourceTask.findUnique({
                where: { id },
                select: { statusId: true, resourceId: true },
            });

            if (!currentTask) throw new Error("Task not found");

            if (currentTask.resourceId !== authorId && !isAdmin) {
                return { success: false, message: "Solo el usuario asignado puede finalizar esta tarea." };
            }

            if (currentTask.statusId === finalStatus.id) {
                return; // Already in final status
            }

            await tx.resourceTask.update({
                where: { id },
                data: { statusId: finalStatus.id },
            });

            await tx.resourceTaskStatusHistory.create({
                data: {
                    taskId: id,
                    fromStatusId: currentTask.statusId,
                    toStatusId: finalStatus.id,
                    changedById: authorId,
                    notes: "Task marked as completed",
                },
            });
        });

        if (txResult && !txResult.success) {
            return txResult;
        }

        revalidatePath("/management/tasks");
        return { success: true, message: "Task completed successfully" };
    } catch (error: any) {
        console.error("Error completing task:", error);
        return { success: false, message: "Failed to complete task" };
    }
}
