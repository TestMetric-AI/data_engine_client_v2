"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import ResourcesTable, { Resource } from "./ResourcesTable";
import ResourceForm from "./ResourceForm";
import Modal from "@/components/ui/Modal";
import { UserPlusIcon } from "@/components/dashboard/icons";

export default function ResourcesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);

    const handleSuccess = () => {
        setIsModalOpen(false);
        setRefreshTrigger((prev) => prev + 1);
        setEditingResource(null);
    };

    const handleEdit = (resource: Resource) => {
        setEditingResource(resource);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingResource(null);
    };

    return (
        <div className="flex bg-surface min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen lg:max-h-screen lg:overflow-hidden">
                <Topbar />
                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="mx-auto max-w-7xl flex flex-col gap-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="font-display text-2xl font-bold text-text-primary">
                                    Resource Management
                                </h1>
                                <p className="text-text-secondary mt-1">
                                    Manage team resources, roles, and allocations.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <UserPlusIcon className="h-5 w-5" />
                                Add New Resource
                            </button>
                        </div>

                        <ResourcesTable
                            refreshTrigger={refreshTrigger}
                            onEdit={handleEdit}
                        />
                    </div>
                </main>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingResource ? "Edit Resource" : "Create New Resource"}
            >
                <ResourceForm
                    initialData={editingResource}
                    onSuccess={handleSuccess}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
}
