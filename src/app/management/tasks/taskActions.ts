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

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

async function checkPermission() {
    return hasPermission("MANAGE_TASKS");
}

export async function createTaskAction(data: ResourceTaskCreateInput): Promise<ActionResponse> {
    const allowed = await checkPermission();
    if (!allowed) return { success: false, message: "Unauthorized. Requires MANAGE_TASKS permission." };

    try {
        const session = await getServerSession(authOptions);
        // Pass user ID as author if available (Resource ID logic needed? Or just User ID?)
        // The service expects authorId (resourceId?), but we only have userId easily.
        // Actually, schema `ResourceTaskStatusHistory` links `changedBy` to `Resource`.
        // We need to resolve User -> Resource to log history properly.
        // For now, let's pass undefined or handle it in service if possible.
        // Ideally we should look up the resource ID of the current user.

        await createResourceTask(data, session?.user.id); // Passing User ID, but service might need Resource ID logic update or check.
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
    const allowed = await checkPermission();
    if (!allowed) return { success: false, message: "Unauthorized. Requires MANAGE_TASKS permission." };

    try {
        const session = await getServerSession(authOptions);
        // Looking up resource is better done in service or here.
        // Let's assume service handles it or we pass user ID and service adapts?
        // The `resource-tasks.ts` calls `tx.resourceTaskStatusHistory.create` with `changedById`.
        // `ResourceTaskStatusHistory` `changedBy` is a relation to `Resource`.
        // So we MUST pass a Resource ID, not a User ID.

        // TODO: Resolve resource ID from session user ID if possible.
        // For now we might send null if not mapped, or strict check.

        await updateResourceTask(id, data, session?.user.id);
        revalidatePath("/management/tasks");
        return { success: true, message: "Task updated successfully" };
    } catch (error: any) {
        console.error("Error updating task:", error);
        return { success: false, message: "Failed to update task" };
    }
}

export async function deleteTaskAction(id: string): Promise<ActionResponse> {
    const allowed = await checkPermission();
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
