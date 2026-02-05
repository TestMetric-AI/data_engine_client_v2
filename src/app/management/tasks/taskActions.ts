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
import { hasPermission } from "@/lib/auth-guards";
import prisma from "@/lib/db";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

async function checkPermission(permission: string) {
    return hasPermission(permission);
}

export async function createTaskAction(data: ResourceTaskCreateInput): Promise<ActionResponse> {
    const allowed = await checkPermission("MANAGE_TASKS");
    if (!allowed) return { success: false, message: "Unauthorized. Requires MANAGE_TASKS permission." };

    try {
        const session = await getServerSession(authOptions);

        const user = await prisma.user.findUnique({
            where: { id: session?.user.id },
            include: { resource: true }
        });
        const authorId = user?.resource?.id;

        // Force approvalStatus to PENDING (default in schema, but explicit here is good)
        // Note: The input type might not have approvalStatus if generated from schema before update.
        // We'll trust Prisma default or pass strict data.

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
    const allowed = await checkPermission("MANAGE_TASKS");
    if (!allowed) return { success: false, message: "Unauthorized. Requires MANAGE_TASKS permission." };

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
    const allowed = await checkPermission("MANAGE_TASKS");
    if (!allowed) return { success: false, message: "Unauthorized. Requires MANAGE_TASKS permission." };

    try {
        await deleteResourceTask(id);
        revalidatePath("/management/tasks");
        return { success: true, message: "Task deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { success: false, message: "Failed to delete task" };
    }
}

async function checkApprovalPermission() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;

    // 1. Check System Permission
    const hasSystemPerm = await hasPermission("APPROVE_TASKS");
    if (hasSystemPerm) return true;

    // 2. Check Resource Role
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { resource: { select: { role: { select: { name: true } } } } }
    });

    return user?.resource?.role?.name === "LEAD";
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
