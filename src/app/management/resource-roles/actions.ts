"use server";

import { revalidatePath } from "next/cache";
import {
    createResourceRole,
    toggleResourceRoleStatus,
    getResourceRoles,
    updateResourceRole,
    ResourceRoleCreateInput,
    ResourceRoleUpdateInput,
} from "@/lib/services/resource-roles";

type ActionResponse = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function getResourceRolesAction(params: {
    page?: number;
    pageSize?: number;
    search?: string;
}) {
    try {
        const data = await getResourceRoles(params);
        return { success: true, data };
    } catch (error) {
        console.error("Error fetching resource roles:", error);
        return { success: false, message: "Failed to fetch resource roles" };
    }
}

export async function createResourceRoleAction(data: ResourceRoleCreateInput): Promise<ActionResponse> {
    try {
        await createResourceRole(data);
        revalidatePath("/management/resource-roles");
        return { success: true, message: "Resource Role created successfully" };
    } catch (error: any) {
        console.error("Error creating resource role:", error);
        if (error.code === 'P2002') { // Unique constraint violation
            return { success: false, message: "A role with this name already exists." };
        }
        return { success: false, message: "Failed to create resource role" };
    }
}

export async function updateResourceRoleAction(
    id: string,
    data: ResourceRoleUpdateInput
): Promise<ActionResponse> {
    try {
        await updateResourceRole(id, data);
        revalidatePath("/management/resource-roles");
        return { success: true, message: "Resource Role updated successfully" };
    } catch (error: any) {
        console.error("Error updating resource role:", error);
        if (error.code === 'P2002') {
            return { success: false, message: "A role with this name already exists." };
        }
        return { success: false, message: "Failed to update resource role" };
    }
}

export async function toggleResourceRoleStatusAction(id: string, isActive: boolean): Promise<ActionResponse> {
    try {
        await toggleResourceRoleStatus(id, isActive);
        revalidatePath("/management/resource-roles");
        return { success: true, message: `Resource Role ${isActive ? 'activated' : 'deactivated'} successfully` };
    } catch (error) {
        console.error("Error toggling resource role status:", error);
        return { success: false, message: "Failed to update resource role status" };
    }
}
