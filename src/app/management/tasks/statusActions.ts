"use server";

import { revalidatePath } from "next/cache";
import {
    createResourceTaskStatus,
    deleteResourceTaskStatus,
    getResourceTaskStatuses,
    updateResourceTaskStatus,
    ResourceTaskStatusCreateInput,
    ResourceTaskStatusUpdateInput,
    reorderResourceTaskStatuses,
} from "@/lib/services/resource-task-statuses";
import { requireServer, Permission } from "@/lib/rbac";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function getResourceTaskStatusesAction(params: {
    search?: string;
}) {
    try {
        const data = await getResourceTaskStatuses(params);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching resource task statuses:", error);
        return { success: false, message: "Failed to fetch resource task statuses" };
    }
}

export async function createResourceTaskStatusAction(data: ResourceTaskStatusCreateInput): Promise<ActionResponse> {
    try {
        await requireServer(Permission.TASKS_MANAGE);
        await createResourceTaskStatus(data);
        revalidatePath("/management/tasks"); // Updated path
        return { success: true, message: "Status created successfully" };
    } catch (error: any) {
        console.error("Error creating resource task status:", error);
        if (error.code === 'P2002') {
            return { success: false, message: "A status with this code or order already exists." };
        }
        return { success: false, message: "Failed to create status" };
    }
}

export async function updateResourceTaskStatusAction(
    id: string,
    data: ResourceTaskStatusUpdateInput
): Promise<ActionResponse> {
    try {
        await requireServer(Permission.TASKS_MANAGE);
        await updateResourceTaskStatus(id, data);
        revalidatePath("/management/tasks"); // Updated path
        return { success: true, message: "Status updated successfully" };
    } catch (error: any) {
        console.error("Error updating resource task status:", error);
        if (error.code === 'P2002') {
            return { success: false, message: "A status with this code or order already exists." };
        }
        return { success: false, message: "Failed to update status" };
    }
}

export async function deleteResourceTaskStatusAction(id: string): Promise<ActionResponse> {
    try {
        await requireServer(Permission.TASKS_MANAGE);
        await deleteResourceTaskStatus(id);
        revalidatePath("/management/tasks"); // Updated path
        return { success: true, message: "Status deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting resource task status:", error);
        if (error.code === 'P2003') { // Foreign key constraint violation
            return { success: false, message: "Cannot delete this status because it is used by one or more tasks." };
        }
        return { success: false, message: "Failed to delete status" };
    }
}

export async function reorderResourceTaskStatusesAction(orderedIds: string[]): Promise<ActionResponse> {
    try {
        await requireServer(Permission.TASKS_MANAGE);
        await reorderResourceTaskStatuses(orderedIds);
        revalidatePath("/management/tasks"); // Updated path
        return { success: true, message: "Statuses reordered successfully" };
    } catch (error) {
        console.error("Error reordering resource task statuses:", error);
        return { success: false, message: "Failed to reorder statuses" };
    }
}
