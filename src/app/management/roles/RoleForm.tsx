"use client";

import { useState } from "react";
import { RoleWithPermissions } from "@/lib/services/roles";
import { Permission } from "@/generated/prisma/client";
import { updateRoleAction, createRoleAction } from "./actions";

interface RoleFormProps {
    roleToEdit?: RoleWithPermissions | null;
    allPermissions: Permission[];
    onSuccess: () => void;
    onCancel: () => void;
}

export default function RoleForm({
    roleToEdit,
    allPermissions,
    onSuccess,
    onCancel,
}: RoleFormProps) {
    const [name, setName] = useState(roleToEdit?.name || "");
    const [description, setDescription] = useState(roleToEdit?.description || "");
    const [isActive, setIsActive] = useState(roleToEdit?.isActive ?? true);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
        roleToEdit?.permissions.map((p) => p.id) || []
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (roleToEdit) {
                await updateRoleAction(
                    roleToEdit.id,
                    { name, description, isActive },
                    selectedPermissions
                );
            } else {
                // Determine how to pass permissions for create - simplified for now
                // Usually we create then assign, or enhance create service
                // For MVP, create basic role via form data
                const formData = new FormData();
                formData.append("name", name);
                formData.append("description", description);
                await createRoleAction(formData);
                // Note: Permission assignment on create not implemented in this simplified flow
                // User would Create -> Then Edit to add permissions
            }
            onSuccess();
        } catch (error) {
            console.error("Error saving role:", error);
            alert("Failed to save role");
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePermission = (permissionId: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary">
                        Role Name
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                </div>

                {roleToEdit && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center h-5">
                            <input
                                id="active-role"
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                        </div>
                        <label htmlFor="active-role" className="text-sm font-medium text-text-primary select-none">
                            Role is Active
                        </label>
                    </div>
                )}

                {roleToEdit && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Permissions
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto rounded-md border border-border p-2 bg-background">
                            {allPermissions.map((permission) => (
                                <label
                                    key={permission.id}
                                    className="flex items-start gap-2 rounded-md p-2 hover:bg-surface cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(permission.id)}
                                        onChange={() => togglePermission(permission.id)}
                                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <div className="text-xs">
                                        <p className="font-medium text-text-primary">
                                            {permission.name}
                                        </p>
                                        <p className="text-text-secondary">
                                            {permission.description}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                {!roleToEdit && (
                    <p className="text-xs text-text-secondary italic">
                        Create the role first, then edit it to assign permissions.
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                    {isSubmitting ? "Saving..." : "Save Role"}
                </button>
            </div>
        </form>
    );
}
