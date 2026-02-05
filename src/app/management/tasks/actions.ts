"use server";

import { revalidatePath } from "next/cache";
import {
    createResourceTask,
    deleteResourceTask,
    getResourceTasks,
    updateResourceTask,
    ResourceTaskCreateInput,
    ResourceTaskUpdateInput,
} from "@/lib/services/resource-tasks";
import { getResourceByUserId } from "@/lib/services/resources";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

async function getCurrentAuthorId() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (user) {
        const resource = await getResourceByUserId(user.id);
        return resource?.id || null;
    }
    return null;
}

export type CreateTaskParams = {
    resourceId: string;
    projectId?: string;
    statusId: string;
    title: string;
    priority: "low" | "medium" | "high";
    dueDate?: Date;
    estimatedHours?: number;
};

export async function createTaskAction(data: CreateTaskParams) {
    try {
        const authorId = await getCurrentAuthorId();

        // Construct Prisma input
        const createInput: ResourceTaskCreateInput = {
            resource: { connect: { id: data.resourceId } },
            project: data.projectId ? { connect: { id: data.projectId } } : undefined,
            status: { connect: { id: data.statusId } },
            title: data.title,
            priority: data.priority,
            dueDate: data.dueDate,
            estimatedHours: data.estimatedHours,
        };

        await createResourceTask(createInput, authorId || undefined);
        revalidatePath("/management/tasks");
        revalidatePath(`/management/resources/${data.resourceId}`);
        return { success: true, message: "Task created successfully" };
    } catch (error: any) {
        console.error("Error creating task:", error);
        return { success: false, message: error.message || "Failed to create task" };
    }
}

export async function updateTaskAction(taskId: string, data: any) {
    // Data typing for update is tricky from client. 
    // We expect partial of fields.
    try {
        const authorId = await getCurrentAuthorId();

        // We need to map simple fields (statusId) to Prisma connect syntax if needed.
        // Or we can rely on caller passing correct structure?
        // Let's assume simpler inputs from UI and we adapt.

        const updateInput: ResourceTaskUpdateInput = {};

        if (data.statusId) {
            updateInput.status = { connect: { id: data.statusId } };
        }
        if (data.title !== undefined) updateInput.title = data.title;
        if (data.priority !== undefined) updateInput.priority = data.priority;
        if (data.dueDate !== undefined) updateInput.dueDate = data.dueDate;
        if (data.estimatedHours !== undefined) updateInput.estimatedHours = data.estimatedHours;
        if (data.actualHours !== undefined) updateInput.actualHours = data.actualHours;
        if (data.projectId !== undefined) {
            updateInput.project = data.projectId ? { connect: { id: data.projectId } } : { disconnect: true };
        }

        await updateResourceTask(taskId, updateInput, authorId || undefined);

        // Revalidate potential paths
        revalidatePath("/management/tasks");
        // We don't know resourceId easily unless we fetch task or pass it.
        // It's safer to just let page refresh or rely on specific revalidation if critical.

        return { success: true, message: "Task updated successfully" };
    } catch (error: any) {
        console.error("Error updating task:", error);
        return { success: false, message: error.message || "Failed to update task" };
    }
}

export async function deleteTaskAction(taskId: string) {
    try {
        await deleteResourceTask(taskId);
        revalidatePath("/management/tasks");
        return { success: true, message: "Task deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { success: false, message: "Failed to delete task" };
    }
}
