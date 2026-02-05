"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PencilSquareIcon, PowerIcon } from "@heroicons/react/24/outline";
import { getResourcesAction, toggleResourceStatusAction } from "./actions";
import Modal from "@/components/ui/Modal";

export type Resource = {
    id: string;
    userId: string;
    fullName: string;
    roleId: string | null;
    allocationPercentage: number;
    active: boolean;
    createdAt: Date | string;
    user: {
        name: string | null;
        email: string;
    };
    role: {
        name: string;
    } | null;
};

interface ResourcesTableProps {
    refreshTrigger: number;
    onEdit: (resource: Resource) => void;
}

export default function ResourcesTable({ refreshTrigger, onEdit }: ResourcesTableProps) {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Status Confirmation Modal State
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [resourceToToggle, setResourceToToggle] = useState<Resource | null>(null);

    const pageSize = 10;

    useEffect(() => {
        fetchResources();
    }, [refreshTrigger, page, searchQuery]);

    async function fetchResources() {
        try {
            setLoading(true);
            const res = await getResourcesAction({ page, pageSize, search: searchQuery });
            if (res.success && res.data) {
                setResources(res.data.resources);
                setTotalPages(res.data.totalPages);
            } else {
                setError(res.message || "Failed to fetch resources");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function initiateToggleStatus(resource: Resource) {
        setResourceToToggle(resource);
        setConfirmModalOpen(true);
    }

    async function handleToggleStatus() {
        if (!resourceToToggle) return;

        try {
            const newStatus = !resourceToToggle.active;
            const res = await toggleResourceStatusAction(resourceToToggle.id, newStatus);
            if (res.success) {
                fetchResources();
                setConfirmModalOpen(false);
                setResourceToToggle(null);
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

    if (loading && resources.length === 0) return <div className="text-sm text-text-secondary p-4">Loading resources...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Resources List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        Total Pages: {totalPages}
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search resources..."
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
                            <th className="whitespace-nowrap px-3 py-3">Full Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Email</th>
                            <th className="whitespace-nowrap px-3 py-3">Role</th>
                            <th className="whitespace-nowrap px-3 py-3">Allocation</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {resources.map((resource) => (
                            <tr key={resource.id} className="text-text-secondary hover:bg-surface/50">
                                <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                                    {resource.fullName}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    {resource.user.email}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    {resource.role?.name || "-"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    {resource.allocationPercentage}%
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${resource.active
                                            ? "bg-green-50 text-green-700"
                                            : "bg-red-50 text-red-700"
                                        }`}>
                                        {resource.active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(resource)}
                                            title="Edit Resource"
                                            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                                        >
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => initiateToggleStatus(resource)}
                                            title={resource.active ? "Deactivate Resource" : "Activate Resource"}
                                            className={`rounded-lg p-2 transition-colors ${resource.active
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
                        {resources.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No resources match your search." : "No resources found."}
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
                title={resourceToToggle?.active ? "Deactivate Resource" : "Activate Resource"}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to {resourceToToggle?.active ? "deactivate" : "activate"} the resource
                        <span className="font-semibold text-text-primary"> "{resourceToToggle?.fullName}"</span>?
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
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${resourceToToggle?.active
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
