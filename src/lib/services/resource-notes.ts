import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ResourceNoteCreateInput = Prisma.ResourceNoteCreateInput;

export async function getResourceNotes(resourceId: string) {
    return prisma.resourceNote.findMany({
        where: { resourceId },
        orderBy: { createdAt: "desc" },
        include: {
            author: {
                select: {
                    id: true,
                    fullName: true,
                    // Maybe include User avatar if available?
                    user: {
                        select: {
                            email: true,
                            name: true,
                        }
                    }
                }
            }
        }
    });
}

export async function createResourceNote(data: ResourceNoteCreateInput) {
    return prisma.resourceNote.create({
        data,
    });
}

export async function deleteResourceNote(id: string) {
    return prisma.resourceNote.delete({
        where: { id },
    });
}
