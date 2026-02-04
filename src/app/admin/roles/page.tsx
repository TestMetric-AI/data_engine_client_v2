"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Modal from "@/components/ui/Modal";
import RolesTable from "./RolesTable";
import RoleForm from "./RoleForm";

export default function RolesPage() {
    const { data: session, status } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingRole, setEditingRole] = useState<any>(null);

    if (status === "loading") {
        return <div className="p-8">Loading...</div>;
    }

    if (!session?.user?.roles?.includes("ADMIN")) {
        if (status === "authenticated") {
            return <div className="p-8 text-rose-600">Access Denied: You do not have permission to view this page.</div>;
        }
        return <div className="p-8">Please log in.</div>;
    }

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        handleCloseModal();
    };

    const handleEdit = (role: any) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-background)_0%,_var(--color-surface)_45%,_#eef2ff_100%)]">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-text-secondary">Admin</p>
                                    <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
                                        Role Management
                                    </h1>
                                    <p className="mt-2 text-sm text-text-secondary">
                                        Manage user roles and permissions.
                                    </p>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:opacity-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Add New Role
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8">
                                <RolesTable
                                    refreshTrigger={refreshTrigger}
                                    onEdit={handleEdit}
                                />
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingRole ? "Edit Role" : "Create New Role"}
            >
                <RoleForm
                    initialData={editingRole}
                    onSuccess={handleSuccess}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
}
