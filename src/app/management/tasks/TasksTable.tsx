"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MagnifyingGlassIcon, FunnelIcon, PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ResourceTask, ResourceTaskStatus, Project, Resource } from "@/generated/prisma/client";
import Modal from "@/components/ui/Modal";
import TaskForm from "./TaskForm";
import { deleteTaskAction } from "./taskActions";
// import { getResourceTasksAction } from "@/app/management/resource-roles/actions";
// I haven't exposed `getResourceTasksAction` in `tasks/actions.ts` yet properly for generic use?
// `tasks/actions.ts` has create/update/delete. I need a getter there or use the service directly in page.
// But this is a client component table (for interactivity/filtering).
// Better to fetch data in Server Page and pass to Client Table?
// OR use server actions for search/filter. 
// Standard pattern: Server Page fetches initial data. Client Table manages local state or URL state for filters.
// Let's use URL state for filters so it's shareable.

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type TaskWithRelations = ResourceTask & {
    status: ResourceTaskStatus;
    project: { name: string; id: string } | null;
    resource: { fullName: string; id: string } | null;
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED"; // Optional if types not yet generated
};

interface TasksTableProps {
    tasks: TaskWithRelations[];
    total: number;
    statuses: ResourceTaskStatus[];
    projects: Project[];
    resources: Resource[]; // For filter dropdown
    canApprove?: boolean;
}

export default function TasksTable({ tasks, total, statuses, projects, resources, canApprove = false }: TasksTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Filters state (sync with URL)
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [statusId, setStatusId] = useState(searchParams.get("statusId") || "");
    const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
    const [resourceId, setResourceId] = useState(searchParams.get("resourceId") || "");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ search });
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    function updateFilters(updates: any) {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value) {
                params.set(key, value as string);
            } else {
                params.delete(key);
            }
        });
        router.push(`${pathname}?${params.toString()}`);
    }

    // Edit Modal State
    const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<TaskWithRelations | null>(null);

    function initiateDelete(task: TaskWithRelations) {
        setTaskToDelete(task);
        setDeleteModalOpen(true);
    }

    async function handleDelete() {
        if (!taskToDelete) return;
        try {
            await deleteTaskAction(taskToDelete.id);
            setDeleteModalOpen(false);
            setTaskToDelete(null);
        } catch (error) {
            console.error(error);
            alert("Failed to delete task");
        }
    }

    async function handleApprove(id: string) {
        try {
            const { approveTaskAction } = await import("./taskActions");
            await approveTaskAction(id);
        } catch (error) {
            console.error(error);
            alert("Failed to approve task");
        }
    }

    async function handleReject(id: string) {
        try {
            const { rejectTaskAction } = await import("./taskActions");
            await rejectTaskAction(id);
        } catch (error) {
            console.error(error);
            alert("Failed to reject task");
        }
    }

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            {/* Header & Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Tasks List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        Total: {total}
                    </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-border bg-surface px-4 py-2 pl-10 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none sm:w-64"
                        />
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                        <select
                            value={statusId}
                            onChange={(e) => {
                                setStatusId(e.target.value);
                                updateFilters({ statusId: e.target.value });
                            }}
                            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        >
                            <option value="">All Statuses</option>
                            {statuses.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <select
                            value={projectId}
                            onChange={(e) => {
                                setProjectId(e.target.value);
                                updateFilters({ projectId: e.target.value });
                            }}
                            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        >
                            <option value="">All Projects</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            value={resourceId}
                            onChange={(e) => {
                                setResourceId(e.target.value);
                                updateFilters({ resourceId: e.target.value });
                            }}
                            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none w-32 sm:w-auto"
                        >
                            <option value="">All Resources</option>
                            {resources.map((r) => (
                                // @ts-ignore
                                <option key={r.id} value={r.id}>{r.fullName || r.id}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="border-b border-border bg-surface text-xs uppercase text-text-secondary">
                        <tr>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Title</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Assigned To</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Approval</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Project</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Priority</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium">Due Date</th>
                            <th className="whitespace-nowrap px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tasks.map((task) => (
                            <tr key={task.id} className="group transition hover:bg-surface/50">
                                <td className="px-4 py-3 font-medium text-text-primary">
                                    {task.title}
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
                                    {/* @ts-ignore */}
                                    {task.resource?.fullName || "Unassigned"}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                        style={{ backgroundColor: task.status.color }}
                                    >
                                        {task.status.name}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize
                                        ${task.approvalStatus === 'APPROVED' ? 'bg-indigo-100 text-indigo-700' :
                                            task.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}
                                     `}>
                                        {task.approvalStatus || 'PENDING'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
                                    {task.project?.name || "-"}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize
                                        ${task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                                     `}>
                                        {task.priority}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
                                    {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        {canApprove && task.approvalStatus === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(task.id)}
                                                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                                                    title="Approve Task"
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(task.id)}
                                                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                                                    title="Reject Task"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                        <div className="flex opacity-0 transition group-hover:opacity-100">
                                            <button
                                                onClick={() => setEditingTask(task)}
                                                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-primary"
                                                title="Edit Task"
                                            >
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => initiateDelete(task)}
                                                className="rounded-lg p-1.5 text-text-secondary hover:bg-rose-50 hover:text-rose-600"
                                                title="Delete Task"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tasks.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-text-secondary">
                                    No tasks found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                title="Edit Task"
            >
                <TaskForm
                    taskToEdit={editingTask}
                    statuses={statuses}
                    projects={projects}
                    resources={resources}
                    onSuccess={() => setEditingTask(null)}
                    onCancel={() => setEditingTask(null)}
                />
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Task"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to delete task <strong>{taskToDelete?.title}</strong>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 mt-2">
                        <button
                            onClick={() => setDeleteModalOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
