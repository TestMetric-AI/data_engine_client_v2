"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/ui/Modal";
import ResourceTaskStatusesTable, { ResourceTaskStatus } from "./ResourceTaskStatusesTable";
import ResourceTaskStatusForm from "./ResourceTaskStatusForm";

export default function ResourceTaskStatusesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusToEdit, setStatusToEdit] = useState<ResourceTaskStatus | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleOpenCreateModal = () => {
        setStatusToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (status: ResourceTaskStatus) => {
        setStatusToEdit(status);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setStatusToEdit(null);
    };

    // Callback to refresh data after mutations
    const handleSuccess = () => {
        setRefreshTrigger((prev) => prev + 1);
        handleCloseModal();
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-text-secondary">Management</p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
                        Task Statuses
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary">
                        Manage statuses for resource tasks.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Status</span>
                </button>
            </div>

            <ResourceTaskStatusesTable
                refreshTrigger={refreshTrigger}
                onEdit={handleOpenEditModal}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={statusToEdit ? "Edit Task Status" : "Create New Task Status"}
            >
                <ResourceTaskStatusForm
                    statusToEdit={statusToEdit}
                    onSuccess={handleSuccess}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
}
