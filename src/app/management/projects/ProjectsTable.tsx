"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PencilSquareIcon, PowerIcon } from "@heroicons/react/24/outline";
import { getProjectsAction, toggleProjectStatusAction } from "./actions";
import Modal from "@/components/ui/Modal";

type Project = {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    createdAt: Date | string;
    isActive: boolean;
};

interface ProjectsTableProps {
    refreshTrigger: number;
    onEdit: (project: Project) => void;
}

const pageSizes = [10, 25, 50, 100];

export default function ProjectsTable({ refreshTrigger, onEdit }: ProjectsTableProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Status Confirmation Modal State
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [projectToToggle, setProjectToToggle] = useState<Project | null>(null);

    const getErrorMessage = (error: unknown) =>
        error instanceof Error ? error.message : "Unexpected error";

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getProjectsAction({ page, pageSize, search: searchQuery });
            if (res.success && res.data) {
                setProjects(res.data.projects);
                setTotal(res.data.total ?? 0);
                setTotalPages(Math.max(1, res.data.totalPages ?? 1));
            } else {
                setError(res.message || "Failed to fetch projects");
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchQuery]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects, refreshTrigger]);

    function initiateToggleStatus(project: Project) {
        setProjectToToggle(project);
        setConfirmModalOpen(true);
    }

    async function handleToggleStatus() {
        if (!projectToToggle) return;

        try {
            const newStatus = !projectToToggle.isActive;
            const res = await toggleProjectStatusAction(projectToToggle.id, newStatus);
            if (res.success) {
                fetchProjects();
                setConfirmModalOpen(false);
                setProjectToToggle(null);
            } else {
                alert(res.message);
            }
        } catch (err: unknown) {
            alert(getErrorMessage(err));
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const canPrev = page > 1;
    const canNext = page < totalPages;
    const visiblePages = useMemo(() => {
        const pages: number[] = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);
        for (let i = start; i <= end; i += 1) {
            pages.push(i);
        }
        return pages;
    }, [page, totalPages]);

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Projects List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        {total} projects
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="rounded-xl border border-border bg-surface px-4 py-2 pl-10 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-0 w-full sm:w-64"
                    />
                    <div className="pointer-events-none absolute left-3 top-2.5 text-text-secondary">
                        <MagnifyingGlassIcon className="h-4 w-4" />
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-text-secondary">
                    Mostrando {loading || error ? 0 : projects.length} de {total} proyectos.
                </div>
            </div>

            <div className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-border">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-card text-xs uppercase text-text-secondary">
                        <tr>
                            <th className="whitespace-nowrap px-3 py-3">Code</th>
                            <th className="whitespace-nowrap px-3 py-3">Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Start Date</th>
                            <th className="whitespace-nowrap px-3 py-3">End Date</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    Cargando proyectos...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-rose-600">
                                    {error}
                                </td>
                            </tr>
                        ) : projects.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No projects match your search." : "No projects found."}
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr key={project.id} className="border-b border-border text-text-secondary hover:bg-surface/50">
                                    <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                                        {project.code || "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3">
                                        {project.name}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3">
                                        {project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3">
                                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${project.isActive
                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                            : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                            }`}>
                                            {project.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => onEdit(project)}
                                                title="Edit Project"
                                                className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => initiateToggleStatus(project)}
                                                title={project.isActive ? "Deactivate Project" : "Activate Project"}
                                                className={`rounded-lg p-2 transition-colors ${project.isActive
                                                    ? "text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                                                    : "text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                    }`}
                                            >
                                                <PowerIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>Page size</span>
                        <select
                            value={pageSize}
                            onChange={(event) => {
                                setPageSize(Number(event.target.value));
                                setPage(1);
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
                        Page {page} of {totalPages} (total {total})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!canPrev}
                        onClick={() => setPage((prev) => prev - 1)}
                        className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
                    >
                        Prev
                    </button>
                    {visiblePages.map((visiblePage) => (
                        <button
                            key={`bottom-${visiblePage}`}
                            type="button"
                            onClick={() => setPage(visiblePage)}
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${visiblePage === page
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
                        onClick={() => setPage((prev) => prev + 1)}
                        className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                title={projectToToggle?.isActive ? "Deactivate Project" : "Activate Project"}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to {projectToToggle?.isActive ? "deactivate" : "activate"} the project
                        <span className="font-semibold text-text-primary"> &quot;{projectToToggle?.name}&quot;</span>?
                    </p>
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={() => setConfirmModalOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleToggleStatus}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${projectToToggle?.isActive
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : "bg-green-600 hover:bg-green-700"
                                }`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
