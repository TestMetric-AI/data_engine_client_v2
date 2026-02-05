"use client";

import { useState } from "react";
import { Permission } from "@/generated/prisma/client";
import { RoleWithPermissions } from "@/lib/services/roles"; // Ensure this type is exported
import Modal from "@/components/ui/Modal";
import RoleForm from "./RoleForm";
import { PlusIcon, PencilIcon, ShieldCheckIcon, UserGroupIcon } from "@heroicons/react/24/outline";

interface RolesPageClientProps {
    roles: RoleWithPermissions[];
    permissions: Permission[];
}

export default function RolesPageClient({ roles, permissions }: RolesPageClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<RoleWithPermissions | null>(null);

    const handleCreate = () => {
        setRoleToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (role: RoleWithPermissions) => {
        setRoleToEdit(role);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setRoleToEdit(null);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-text-secondary">Management</p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
                        Roles & Permissions
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary">
                        Manage system access and assign permissions.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Role</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className={`group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md ${!role.isActive ? "opacity-60 grayscale-[50%]" : ""}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${role.isActive ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"}`}>
                                    <ShieldCheckIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-text-primary">{role.name}</h3>
                                        {!role.isActive && (
                                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-secondary">{role._count.users} users</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleEdit(role)}
                                className="rounded-lg p-2 text-text-tertiary transition hover:bg-surface hover:text-primary"
                            >
                                <PencilIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-sm text-text-secondary mb-6 line-clamp-2 min-h-[2.5em]">
                            {role.description || "No description provided."}
                        </p>

                        <div className="mt-auto pt-4 border-t border-border">
                            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                Permissions ({role.permissions.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {role.permissions.slice(0, 5).map((p) => (
                                    <span
                                        key={p.id}
                                        className="inline-flex rounded-md bg-surface px-2 py-1 text-xs font-medium text-text-secondary ring-1 ring-inset ring-border"
                                    >
                                        {p.name}
                                    </span>
                                ))}
                                {role.permissions.length > 5 && (
                                    <span className="inline-flex rounded-md bg-surface px-2 py-1 text-xs font-medium text-text-tertiary">
                                        +{role.permissions.length - 5} more
                                    </span>
                                )}
                                {role.permissions.length === 0 && (
                                    <span className="text-xs text-text-tertiary italic">
                                        No specific permissions
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleClose}
                title={roleToEdit ? "Edit Role & Permissions" : "Create New Role"}
            >
                <RoleForm
                    roleToEdit={roleToEdit}
                    allPermissions={permissions}
                    onSuccess={handleClose}
                    onCancel={handleClose}
                />
            </Modal>
        </div>
    );
}
