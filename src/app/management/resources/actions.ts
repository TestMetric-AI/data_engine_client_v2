"use server";

import { revalidatePath } from "next/cache";
import {
    createResource,
    getResources,
    updateResource,
    toggleResourceStatus,
    getEligibleUsers,
    getResourceRoles,
    ResourceCreateInput,
    ResourceUpdateInput,
} from "@/lib/services/resources";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function getResourcesAction(params: {
    page?: number;
    pageSize?: number;
    search?: string;
}) {
    try {
        const data = await getResources(params);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching resources:", error);
        return { success: false, message: "Failed to fetch resources" };
    }
}

export async function createResourceAction(data: ResourceCreateInput): Promise<ActionResponse> {
    try {
        await createResource(data);
        revalidatePath("/management/resources");
        return { success: true, message: "Resource created successfully" };
    } catch (error: any) {
        console.error("Error creating resource:", error);
        return { success: false, message: error.message || "Failed to create resource" };
    }
}

export async function updateResourceAction(
    id: string,
    data: ResourceUpdateInput
): Promise<ActionResponse> {
    try {
        await updateResource(id, data);
        revalidatePath("/management/resources");
        return { success: true, message: "Resource updated successfully" };
    } catch (error) {
        console.error("Error updating resource:", error);
        return { success: false, message: "Failed to update resource" };
    }
}

export async function toggleResourceStatusAction(id: string, isActive: boolean): Promise<ActionResponse> {
    try {
        await toggleResourceStatus(id, isActive);
        revalidatePath("/management/resources");
        return { success: true, message: `Resource ${isActive ? "activated" : "deactivated"} successfully` };
    } catch (error) {
        console.error("Error toggling resource status:", error);
        return { success: false, message: "Failed to update resource status" };
    }
}

export async function getFormDataAction() {
    try {
        const [users, roles] = await Promise.all([
            getEligibleUsers(),
            getResourceRoles(),
        ]);
        return { success: true, data: { users, roles } };
    } catch (error) {
        console.error("Error fetching form data:", error);
        return { success: false, message: "Failed to fetch form data" };
    }
}
