"use server";

import { revalidatePath } from "next/cache";
import {
    createProject,
    toggleProjectStatus,
    getProjects,
    updateProject,
    ProjectCreateInput,
    ProjectUpdateInput,
} from "@/lib/services/projects";
import { requireServer, Permission } from "@/lib/rbac";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function getProjectsAction(params: {
    page?: number;
    pageSize?: number;
    search?: string;
}) {
    try {
        const data = await getProjects(params);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching projects:", error);
        return { success: false, message: "Failed to fetch projects" };
    }
}

export async function createProjectAction(data: ProjectCreateInput): Promise<ActionResponse> {
    try {
        await requireServer(Permission.PROJECTS_MANAGE);
        await createProject(data);
        revalidatePath("/management/projects");
        return { success: true, message: "Project created successfully" };
    } catch (error) {
        console.error("Error creating project:", error);
        return { success: false, message: "Failed to create project" };
    }
}

export async function updateProjectAction(
    id: string,
    data: ProjectUpdateInput
): Promise<ActionResponse> {
    try {
        await requireServer(Permission.PROJECTS_MANAGE);
        await updateProject(id, data);
        revalidatePath("/management/projects");
        return { success: true, message: "Project updated successfully" };
    } catch (error) {
        console.error("Error updating project:", error);
        return { success: false, message: "Failed to update project" };
    }
}

export async function toggleProjectStatusAction(id: string, isActive: boolean): Promise<ActionResponse> {
    try {
        await requireServer(Permission.PROJECTS_MANAGE);
        await toggleProjectStatus(id, isActive);
        revalidatePath("/management/projects");
        return { success: true, message: `Project ${isActive ? "activated" : "deactivated"} successfully` };
    } catch (error) {
        console.error("Error toggling project status:", error);
        return { success: false, message: "Failed to update project status" };
    }
}
