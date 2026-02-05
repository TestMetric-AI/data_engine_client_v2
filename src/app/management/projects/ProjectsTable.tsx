"use client";

import { useEffect, useState } from "react";
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

export default function ProjectsTable({ refreshTrigger, onEdit }: ProjectsTableProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Status Confirmation Modal State
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [projectToToggle, setProjectToToggle] = useState<Project | null>(null);

    const pageSize = 10;

    useEffect(() => {
        fetchProjects();
    }, [refreshTrigger, page, searchQuery]);

    async function fetchProjects() {
        try {
            setLoading(true);
            const res = await getProjectsAction({ page, pageSize, search: searchQuery });
            if (res.success && res.data) {
                setProjects(res.data.projects);
                setTotalPages(res.data.totalPages);
            } else {
                setError(res.message || "Failed to fetch projects");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

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
        } catch (err: any) {
            alert(err.message);
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    if (loading && projects.length === 0) return <div className="text-sm text-text-secondary p-4">Loading projects...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Projects List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        Total Pages: {totalPages}
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
            <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-text-secondary">
                        <tr>
                            <th className="whitespace-nowrap px-3 py-3">Code</th>
                            <th className="whitespace-nowrap px-3 py-3">Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Start Date</th>
                            <th className="whitespace-nowrap px-3 py-3">End Date</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {projects.map((project) => (
                            <tr key={project.id} className="text-text-secondary hover:bg-surface/50">
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
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${project.isActive
                                            ? "bg-green-50 text-green-700"
                                            : "bg-red-50 text-red-700"
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
                                                    ? "text-text-secondary hover:bg-rose-50 hover:text-rose-600"
                                                    : "text-text-secondary hover:bg-green-50 hover:text-green-600"
                                                }`}
                                        >
                                            <PowerIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {projects.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No projects match your search." : "No projects found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-between items-center text-sm text-text-secondary">
                <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="disabled:opacity-50 hover:text-text-primary"
                >
                    Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="disabled:opacity-50 hover:text-text-primary"
                >
                    Next
                </button>
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
                        <span className="font-semibold text-text-primary"> "{projectToToggle?.name}"</span>?
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
