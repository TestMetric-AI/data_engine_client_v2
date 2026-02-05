"use server";

import { createRole, deleteRole, updateRole } from "@/lib/services/roles";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guards";

export async function createRoleAction(formData: FormData) {
    await requirePermission("MANAGE_USERS"); // Or a specific MANAGE_ROLES permission

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    await createRole({
        name,
        description,
    });

    revalidatePath("/management/roles");
}

export async function updateRoleAction(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
    permissionIds?: string[]
) {
    await requirePermission("MANAGE_USERS");

    await updateRole(id, data, permissionIds);

    revalidatePath("/management/roles");
}

export async function deleteRoleAction(id: string) {
    await requirePermission("MANAGE_USERS");

    await deleteRole(id);

    revalidatePath("/management/roles");
}
