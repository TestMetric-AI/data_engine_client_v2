"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
} from "react";
import { format } from "date-fns";
import { EllipsisVerticalIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResourceTask, ResourceTaskStatus, Project, Resource } from "@/generated/prisma/client";
import Modal from "@/components/ui/Modal";
import TaskForm from "./TaskForm";
import { deleteTaskAction } from "./taskActions";
import TaskDailiesModal from "./TaskDailiesModal";
import { getDailiesAction } from "./dailyActions";
// import { getResourceTasksAction } from "@/app/management/resource-roles/actions";
// I haven't exposed `getResourceTasksAction` in `tasks/actions.ts` yet properly for generic use?
// `tasks/actions.ts` has create/update/delete. I need a getter there or use the service directly in page.
// But this is a client component table (for interactivity/filtering).
// Better to fetch data in Server Page and pass to Client Table?
// OR use server actions for search/filter. 
// Standard pattern: Server Page fetches initial data. Client Table manages local state or URL state for filters.
// Let's use URL state for filters so it's shareable.

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type TaskBase = Omit<ResourceTask, "estimatedHours" | "actualHours"> & {
    estimatedHours: number | null;
    actualHours: number | null;
};

export type TaskWithRelations = TaskBase & {
    status: ResourceTaskStatus;
    project: { name: string; id: string } | null;
    resource: { fullName: string; id: string } | null;
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED"; // Optional if types not yet generated
};

interface TaskDailyDetail {
    id: string;
    content: string;
    date: string | Date;
    resource?: {
        fullName?: string | null;
    } | null;
}

interface TasksTableProps {
    tasks: TaskWithRelations[];
    total: number;
    currentPage: number;
    currentPageSize: number;
    totalPages: number;
    statuses: ResourceTaskStatus[];
    projects: Project[];
    resources: Resource[]; // For filter dropdown + task form
    canApprove?: boolean;
    currentResourceId?: string | null;
}

const pageSizes = [10, 25, 50, 100];
const MENU_WIDTH_PX = 220;

export default function TasksTable({
    tasks,
    total,
    currentPage,
    currentPageSize,
    totalPages,
    statuses,
    projects,
    resources,
    canApprove = false,
    currentResourceId = null,
}: TasksTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Filters state (sync with URL)
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [statusId, setStatusId] = useState(searchParams.get("statusId") || "");
    const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
    const [resourceId, setResourceId] = useState(searchParams.get("resourceId") || "");

    // Use a ref for searchParams to avoid recreating updateFilters on every render
    const searchParamsRef = useRef(searchParams);
    searchParamsRef.current = searchParams;

    const updateFilters = useCallback((updates: Record<string, string>) => {
        const params = new URLSearchParams(searchParamsRef.current.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        router.push(`${pathname}?${params.toString()}`);
    }, [pathname, router]);

    // Debounce search - only trigger on actual user input changes
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            updateFilters({ search, page: "1" });
        }, 500);
        return () => clearTimeout(timer);
    }, [search, updateFilters]);

    // Edit Modal State
    const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<TaskWithRelations | null>(null);
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState<TaskWithRelations | null>(null);
    const [dailyTask, setDailyTask] = useState<TaskWithRelations | null>(null);
    const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null);
    const [detailDailies, setDetailDailies] = useState<TaskDailyDetail[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [menuMode, setMenuMode] = useState<"context" | "kebab">("context");
    const [menuFocusIndex, setMenuFocusIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement | null>(null);

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

    // Determine the final status id (highest orderIndex)
    const finalStatusId = statuses.length > 0
        ? statuses.reduce((prev, curr) => (curr.orderIndex > prev.orderIndex ? curr : prev)).id
        : null;

    function initiateComplete(task: TaskWithRelations) {
        setTaskToComplete(task);
        setCompleteModalOpen(true);
    }

    async function handleComplete() {
        if (!taskToComplete) return;
        try {
            const { completeTaskAction } = await import("./taskActions");
            const result = await completeTaskAction(taskToComplete.id);
            if (!result.success) {
                alert(result.message || "Failed to complete task");
                return;
            }
            setCompleteModalOpen(false);
            setTaskToComplete(null);
        } catch (error) {
            console.error(error);
            alert("Failed to complete task");
        }
    }

    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;
    const visiblePages = useMemo(() => {
        const pages: number[] = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        for (let i = start; i <= end; i += 1) {
            pages.push(i);
        }
        return pages;
    }, [currentPage, totalPages]);

    const closeMenu = useCallback(() => {
        setOpenMenuTaskId(null);
    }, []);

    const currentMenuTask = useMemo(
        () => tasks.find((task) => task.id === openMenuTaskId) ?? null,
        [openMenuTaskId, tasks],
    );

    const menuActions = useMemo(() => {
        if (!currentMenuTask) return [];

        const actions: Array<{
            id: string;
            label: string;
            danger?: boolean;
            onSelect: () => void | Promise<void>;
        }> = [];

        if (canApprove && currentMenuTask.approvalStatus === "PENDING") {
            actions.push(
                {
                    id: "approve",
                    label: "Approve Task",
                    onSelect: () => handleApprove(currentMenuTask.id),
                },
                {
                    id: "reject",
                    label: "Reject Task",
                    danger: true,
                    onSelect: () => handleReject(currentMenuTask.id),
                },
            );
        }

        if (
            finalStatusId
            && currentMenuTask.status.id !== finalStatusId
            && currentMenuTask.resource?.id === currentResourceId
        ) {
            actions.push({
                id: "complete",
                label: "Mark as completed",
                onSelect: () => initiateComplete(currentMenuTask),
            });
        }

        actions.push(
            {
                id: "view-details",
                label: "View details",
                onSelect: () => setDetailTask(currentMenuTask),
            },
            {
                id: "edit",
                label: "Edit Task",
                onSelect: () => setEditingTask(currentMenuTask),
            },
            {
                id: "delete",
                label: "Delete Task",
                danger: true,
                onSelect: () => initiateDelete(currentMenuTask),
            },
            {
                id: "daily",
                label: "Daily Updates",
                onSelect: () => setDailyTask(currentMenuTask),
            },
        );

        return actions;
    }, [canApprove, currentMenuTask, currentResourceId, finalStatusId]);

    const openMenuAtPoint = useCallback((taskId: string, x: number, y: number, mode: "context" | "kebab") => {
        const maxX = typeof window !== "undefined" ? window.innerWidth - MENU_WIDTH_PX - 12 : x;
        setMenuPosition({ x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, y) });
        setMenuMode(mode);
        setMenuFocusIndex(0);
        setOpenMenuTaskId(taskId);
    }, []);

    function handleRowContextMenu(event: ReactMouseEvent<HTMLTableRowElement>, taskId: string) {
        event.preventDefault();
        openMenuAtPoint(taskId, event.clientX, event.clientY, "context");
    }

    function handleKebabClick(event: ReactMouseEvent<HTMLButtonElement>, taskId: string) {
        event.stopPropagation();
        if (openMenuTaskId === taskId) {
            closeMenu();
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        openMenuAtPoint(taskId, rect.right - MENU_WIDTH_PX, rect.bottom + 6, "kebab");
    }

    async function executeMenuAction(index: number) {
        const action = menuActions[index];
        if (!action) return;
        closeMenu();
        await action.onSelect();
    }

    function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (!menuActions.length) return;

        switch (event.key) {
            case "Escape":
                event.preventDefault();
                closeMenu();
                return;
            case "ArrowDown":
                event.preventDefault();
                setMenuFocusIndex((prev) => (prev + 1) % menuActions.length);
                return;
            case "ArrowUp":
                event.preventDefault();
                setMenuFocusIndex((prev) => (prev - 1 + menuActions.length) % menuActions.length);
                return;
            case "Home":
                event.preventDefault();
                setMenuFocusIndex(0);
                return;
            case "End":
                event.preventDefault();
                setMenuFocusIndex(menuActions.length - 1);
                return;
            case "Enter":
            case " ":
                event.preventDefault();
                void executeMenuAction(menuFocusIndex);
                return;
            default:
                return;
        }
    }

    useEffect(() => {
        if (!openMenuTaskId) return;

        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                closeMenu();
            }
        }

        function handleScrollOrResize() {
            closeMenu();
        }

        window.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [closeMenu, openMenuTaskId]);

    useEffect(() => {
        closeMenu();
    }, [closeMenu, pathname, searchParams]);

    useEffect(() => {
        if (!openMenuTaskId || !menuRef.current) return;
        const items = menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
        if (!items.length) return;
        const safeIndex = Math.min(menuFocusIndex, items.length - 1);
        items[safeIndex]?.focus();
    }, [menuActions.length, menuFocusIndex, openMenuTaskId, menuMode]);

    useEffect(() => {
        let cancelled = false;

        async function loadTaskDailies() {
            if (!detailTask) {
                setDetailDailies([]);
                setDetailError(null);
                return;
            }

            setDetailLoading(true);
            setDetailError(null);

            const result = await getDailiesAction(detailTask.id);
            if (cancelled) return;

            if (result.success) {
                setDetailDailies((result.data as TaskDailyDetail[]) ?? []);
            } else {
                setDetailDailies([]);
                setDetailError(result.message || "Failed to load dailies.");
            }

            setDetailLoading(false);
        }

        void loadTaskDailies();
        return () => {
            cancelled = true;
        };
    }, [detailTask]);

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
                                updateFilters({ statusId: e.target.value, page: "1" });
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
                                updateFilters({ projectId: e.target.value, page: "1" });
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
                                updateFilters({ resourceId: e.target.value, page: "1" });
                            }}
                            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none w-32 sm:w-auto"
                        >
                            <option value="">All Resources</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>{r.fullName || r.id}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-text-secondary">
                    Mostrando {tasks.length} de {total} tareas.
                </div>
            </div>

            {/* Table */}
            <div className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-border">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-card text-xs uppercase text-text-secondary">
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
                            <tr
                                key={task.id}
                                className="group transition hover:bg-surface/50"
                                onContextMenu={(event) => handleRowContextMenu(event, task.id)}
                            >
                                <td className="px-4 py-3 font-medium text-text-primary">
                                    {task.title}
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
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
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={(event) => handleKebabClick(event, task.id)}
                                            aria-label={`Open actions menu for task ${task.title}`}
                                            className="rounded-lg p-1.5 text-text-secondary transition hover:bg-surface hover:text-primary"
                                        >
                                            <EllipsisVerticalIcon className="h-5 w-5" />
                                        </button>
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

            {openMenuTaskId && menuActions.length > 0 && (
                <div
                    ref={menuRef}
                    role="menu"
                    aria-label="Task actions"
                    tabIndex={-1}
                    onKeyDown={handleMenuKeyDown}
                    className="fixed z-50 w-[220px] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
                    style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
                >
                    {menuActions.map((action, index) => (
                        <button
                            key={action.id}
                            type="button"
                            role="menuitem"
                            onClick={() => void executeMenuAction(index)}
                            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface focus:bg-surface focus:outline-none ${action.danger ? "text-rose-600" : "text-text-primary"}`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>Page size</span>
                        <select
                            value={currentPageSize}
                            onChange={(event) => {
                                updateFilters({ pageSize: String(Number(event.target.value)), page: "1" });
                            }}
                            className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-text-primary"
                        >
                            {pageSizes.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span>
                        Page {currentPage} of {totalPages} (total {total})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!canPrev}
                        onClick={() => updateFilters({ page: String(currentPage - 1) })}
                        className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
                    >
                        Prev
                    </button>
                    {visiblePages.map((visiblePage) => (
                        <button
                            key={`bottom-${visiblePage}`}
                            type="button"
                            onClick={() => updateFilters({ page: String(visiblePage) })}
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${visiblePage === currentPage
                                ? "bg-primary text-white"
                                : "border border-border bg-card text-text-secondary"
                                }`}
                        >
                            {visiblePage}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={!canNext}
                        onClick={() => updateFilters({ page: String(currentPage + 1) })}
                        className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            <Modal
                isOpen={!!detailTask}
                onClose={() => setDetailTask(null)}
                title={`Task details: ${detailTask?.title ?? ""}`}
            >
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-text-primary sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Title</p>
                            <p>{detailTask?.title || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Status</p>
                            <p>{detailTask?.status?.name || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Assigned To</p>
                            <p>{detailTask?.resource?.fullName || "Unassigned"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Project</p>
                            <p>{detailTask?.project?.name || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Priority</p>
                            <p className="capitalize">{detailTask?.priority || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Approval</p>
                            <p>{detailTask?.approvalStatus || "PENDING"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Due Date</p>
                            <p>{detailTask?.dueDate ? format(new Date(detailTask.dueDate), "MMM d, yyyy") : "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Created At</p>
                            <p>{detailTask?.createdAt ? format(new Date(detailTask.createdAt), "MMM d, yyyy HH:mm") : "-"}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase text-text-secondary">Dailies Reportados</p>
                        </div>
                        <div className="max-h-[45vh] space-y-3 overflow-y-auto">
                            {detailLoading ? (
                                <p className="text-sm text-text-secondary">Loading dailies...</p>
                            ) : detailError ? (
                                <p className="text-sm text-rose-600">{detailError}</p>
                            ) : detailDailies.length === 0 ? (
                                <p className="text-sm text-text-secondary">No dailies recorded yet.</p>
                            ) : (
                                detailDailies.map((daily) => (
                                    <div key={daily.id} className="rounded-xl border border-border bg-surface p-3">
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-text-primary">
                                                {daily.resource?.fullName || "Unknown resource"}
                                            </span>
                                            <span className="text-[10px] text-text-secondary">
                                                {format(new Date(daily.date), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm text-text-primary">{daily.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

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

            {/* Complete Confirmation Modal */}
            <Modal
                isOpen={completeModalOpen}
                onClose={() => {
                    setCompleteModalOpen(false);
                    setTaskToComplete(null);
                }}
                title="Mark Task as Completed"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to mark task <strong>{taskToComplete?.title}</strong> as completed?
                    </p>
                    <div className="mt-2 flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setCompleteModalOpen(false);
                                setTaskToComplete(null);
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleComplete}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
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

            <TaskDailiesModal
                isOpen={!!dailyTask}
                onClose={() => setDailyTask(null)}
                task={dailyTask}
            />
        </section>
    );
}
