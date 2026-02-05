
import { Suspense } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import TasksTable from "./TasksTable";
import { getResourceTasks } from "@/lib/services/resource-tasks";
import { getResourceTaskStatuses } from "@/lib/services/resource-task-statuses";
import { getProjects } from "@/lib/services/projects";
import { getResources } from "@/lib/services/resources";

export const dynamic = "force-dynamic";

interface TasksPageProps {
    searchParams: {
        search?: string;
        statusId?: string;
        projectId?: string;
        resourceId?: string;
    };
}

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default async function TasksPage({ searchParams }: TasksPageProps) {
    const { search, statusId, projectId, resourceId } = searchParams;

    const [tasksData, statuses, projectsData, resourcesData] = await Promise.all([
        getResourceTasks({
            search,
            statusId,
            projectId,
            resourceId,
            pageSize: 50
        }),
        getResourceTaskStatuses(),
        getProjects({}), // Pass params if required by signature
        getResources({ pageSize: 100 }) // Get reasonable list of resources for filter
    ]);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-background)_0%,_var(--color-surface)_45%,_#eef2ff_100%)]">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-text-secondary">Management</p>
                                        <h1 className="font-display text-2xl font-bold text-text-primary">
                                            Tasks
                                        </h1>
                                        <p className="text-sm text-text-secondary">
                                            Manage and track all resource tasks.
                                        </p>
                                    </div>
                                    {/* 
                                    <button
                                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                        <span>New Task</span>
                                    </button> 
                                    */}
                                </div>

                                <Suspense fallback={<div>Loading tasks...</div>}>
                                    <TasksTable
                                        tasks={tasksData.tasks as any} // Cast because simpler types in client
                                        total={tasksData.total}
                                        statuses={statuses}
                                        projects={projectsData.projects}
                                        resources={resourcesData.resources as any}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
