import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ProjectWhereInput = Prisma.ProjectWhereInput;
export type ProjectCreateInput = Prisma.ProjectCreateInput;
export type ProjectUpdateInput = Prisma.ProjectUpdateInput;

export type GetProjectsParams = {
    page?: number;
    pageSize?: number;
    search?: string;
};

export async function getProjects({
    page = 1,
    pageSize = 10,
    search = "",
}: GetProjectsParams) {
    const skip = (page - 1) * pageSize;
    const where: ProjectWhereInput = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ],
        }
        : {};

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
        }),
        prisma.project.count({ where }),
    ]);

    return {
        projects,
        total,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getProjectById(id: string) {
    return prisma.project.findUnique({
        where: { id },
    });
}

export async function createProject(data: ProjectCreateInput) {
    return prisma.project.create({
        data,
    });
}

export async function updateProject(id: string, data: ProjectUpdateInput) {
    return prisma.project.update({
        where: { id },
        data,
    });
}

export async function toggleProjectStatus(id: string, isActive: boolean) {
    return prisma.project.update({
        where: { id },
        data: { isActive },
    });
}

export async function deleteProject(id: string) {
    return prisma.project.delete({
        where: { id },
    });
}
