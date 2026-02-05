"use client";

import { useState } from "react";
import TasksTable from "./TasksTable";
import TaskStatusesView from "./TaskStatusesView";
import { ResourceTaskStatus, Project, Resource } from "@/generated/prisma/client";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/ui/Modal";
import TaskForm from "./TaskForm";
// import { ResourceTask } from "@/generated/prisma/client"; // Use the type from table?
// TasksTable defines its own TaskWithRelations type. We should probably accept `any` for tasks to avoid complex type drilling or export the type.
// Let's import the type from TasksTable if possible, or just use any for now as `TasksTable` handles the casting.

interface TasksClientPageProps {
    tasks: any[]; // Using any to match the loose typing in existing page
    total: number;
    statuses: ResourceTaskStatus[];
    projects: Project[];
    resources: Resource[];
}

export default function TasksClientPage({ tasks, total, statuses, projects, resources }: TasksClientPageProps) {
    const [activeTab, setActiveTab] = useState<"tasks" | "statuses">("tasks");

    // Create Task Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger re-table load if needed, or rely on Server Actions revalidate

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-text-secondary">Management</p>
                    <h1 className="font-display text-2xl font-bold text-text-primary">
                        Tasks
                    </h1>
                    <p className="text-sm text-text-secondary">
                        Manage tasks and their configuration.
                    </p>
                </div>
                {activeTab === "tasks" && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>New Task</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={`
                            whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                            ${activeTab === "tasks"
                                ? "border-primary text-primary"
                                : "border-transparent text-text-secondary hover:border-border hover:text-text-primary"
                            }
                        `}
                    >
                        Tasks List
                    </button>
                    <button
                        onClick={() => setActiveTab("statuses")}
                        className={`
                            whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                            ${activeTab === "statuses"
                                ? "border-primary text-primary"
                                : "border-transparent text-text-secondary hover:border-border hover:text-text-primary"
                            }
                        `}
                    >
                        Task Statuses
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === "tasks" ? (
                <>
                    <TasksTable
                        tasks={tasks}
                        total={total}
                        statuses={statuses}
                        projects={projects}
                        resources={resources}
                    />

                    <Modal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        title="Create New Task"
                    >
                        <TaskForm
                            statuses={statuses}
                            projects={projects}
                            resources={resources}
                            onSuccess={() => setIsCreateModalOpen(false)}
                            onCancel={() => setIsCreateModalOpen(false)}
                        />
                    </Modal>
                </>
            ) : (
                <TaskStatusesView />
            )}
        </div>
    );
}
