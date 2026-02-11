"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function createDailyAction(data: {
    taskId: string;
    content: string;
    date?: string; // Passed as ISO string from UI often
}): Promise<ActionResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, message: "Unauthorized" };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { resource: true }
        });

        if (!user?.resource) {
            return { success: false, message: "User is not linked to a Resource profile." };
        }

        await prisma.resourceTaskDaily.create({
            data: {
                taskId: data.taskId,
                resourceId: user.resource.id,
                content: data.content,
                date: data.date ? new Date(data.date) : new Date(),
            }
        });

        revalidatePath("/management/tasks");
        return { success: true, message: "Daily registered successfully" };
    } catch (error: any) {
        console.error("Error creating daily:", error);
        return { success: false, message: "Failed to register daily" };
    }
}

export async function getDailiesAction(taskId: string): Promise<ActionResponse> {
    try {
        const dailies = await prisma.resourceTaskDaily.findMany({
            where: { taskId },
            include: {
                resource: {
                    select: { fullName: true, id: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: dailies };
    } catch (error: any) {
        console.error("Error fetching dailies:", error);
        return { success: false, message: "Failed to fetch dailies" };
    }
}

export async function deleteDailyAction(dailyId: string): Promise<ActionResponse> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, message: "Unauthorized" };
        }

        const daily = await prisma.resourceTaskDaily.findUnique({
            where: { id: dailyId },
            include: { resource: true }
        });

        if (!daily) {
            return { success: false, message: "Daily not found" };
        }

        // Check ownership or admin/manager permission
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { resource: true }
        });

        // Allow deletion if user is the author
        const isAuthor = user?.resource?.id === daily.resourceId;

        if (!isAuthor) {
            // For now prohibit
            return { success: false, message: "Unauthorized. You can only delete your own dailies." };
        }

        await prisma.resourceTaskDaily.delete({
            where: { id: dailyId }
        });

        revalidatePath("/management/tasks");
        return { success: true, message: "Daily deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting daily:", error);
        return { success: false, message: "Failed to delete daily" };
    }
}
