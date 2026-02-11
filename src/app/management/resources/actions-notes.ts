"use server";

import { revalidatePath } from "next/cache";
import {
    createResourceNote,
    deleteResourceNote,
    getResourceNotes,
    ResourceNoteCreateInput,
} from "@/lib/services/resource-notes";
import { getResourceByUserId } from "@/lib/services/resources";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireServer, Permission } from "@/lib/rbac";
import prisma from "@/lib/db";

// Assuming we can get session.

export async function getResourceNotesAction(resourceId: string) {
    try {
        const notes = await getResourceNotes(resourceId);
        return { success: true, data: notes };
    } catch (error) {
        console.error("Error fetching resource notes:", error);
        return { success: false, message: "Failed to fetch notes" };
    }
}

export async function createResourceNoteAction(resourceId: string, noteContent: string) {
    try {
        await requireServer(Permission.RESOURCES_MANAGE);
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, message: "Not authenticated" };
        }

        // Find the resource profile of the current user to set as author
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        let authorId = null;
        if (user) {
            const authorResource = await getResourceByUserId(user.id);
            if (authorResource) {
                authorId = authorResource.id;
            }
        }

        await createResourceNote({
            note: noteContent,
            resource: { connect: { id: resourceId } },
            author: authorId ? { connect: { id: authorId } } : undefined,
        });

        revalidatePath(`/management/resources/${resourceId}`);
        return { success: true, message: "Note added successfully" };
    } catch (error) {
        console.error("Error creating resource note:", error);
        return { success: false, message: "Failed to create note" };
    }
}

export async function deleteResourceNoteAction(id: string, resourceId: string) {
    try {
        await requireServer(Permission.RESOURCES_MANAGE);
        await deleteResourceNote(id);
        revalidatePath(`/management/resources/${resourceId}`);
        return { success: true, message: "Note deleted successfully" };
    } catch (error) {
        console.error("Error deleting resource note:", error);
        return { success: false, message: "Failed to delete note" };
    }
}
