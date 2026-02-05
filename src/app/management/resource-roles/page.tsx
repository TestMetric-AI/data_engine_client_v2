"use client";

import { useState } from "react";
import ResourceRolesTable, { ResourceRole } from "./ResourceRolesTable";
import ResourceRoleForm from "./ResourceRoleForm";
import Modal from "@/components/ui/Modal";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function ResourceRolesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingRole, setEditingRole] = useState<ResourceRole | null>(null);

    const handleSuccess = () => {
        setIsModalOpen(false);
        setRefreshTrigger((prev) => prev + 1);
        setEditingRole(null);
    };

    const handleEdit = (role: ResourceRole) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">
                        Resource Roles
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Define roles for resource allocation and management.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <PlusIcon className="h-5 w-5" />
                    Create New Role
                </button>
            </div>

            <ResourceRolesTable
                refreshTrigger={refreshTrigger}
                onEdit={handleEdit}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingRole ? "Edit Resource Role" : "Create Resource Role"}
            >
                <ResourceRoleForm
                    initialData={editingRole}
                    onSuccess={handleSuccess}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
}
