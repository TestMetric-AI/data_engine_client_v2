"use client";

import { useState } from "react";
// import { useSession } from "next-auth/react";
import Modal from "@/components/ui/Modal";
// import ProjectsTable from "./ProjectsTable"; // Correct import path check needed
// import ProjectForm from "./ProjectForm"; // Correct import path check needed
import ProjectsTable from "./ProjectsTable";
import ProjectForm from "./ProjectForm";

export default function ProjectsPage() {
    // const { data: session, status } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingProject, setEditingProject] = useState<any>(null);

    // if (status === "loading") {
    //     return <div className="p-8">Loading...</div>;
    // }

    // if (!session) {
    //      return <div className="p-8">Please log in.</div>;
    // }

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        handleCloseModal();
    };

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProject(null);
    };

    return (
        <div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-text-secondary">Management</p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
                        Project Management
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary">
                        Create and manage projects.
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
                        Add New Project
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <ProjectsTable
                    refreshTrigger={refreshTrigger}
                    onEdit={handleEdit}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProject ? "Edit Project" : "Create New Project"}
            >
                <ProjectForm
                    initialData={editingProject}
                    onSuccess={handleSuccess}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </div>
    );
}
