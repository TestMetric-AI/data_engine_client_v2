"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { getResourceTaskStatusesAction, deleteResourceTaskStatusAction } from "./statusActions";
import Modal from "@/components/ui/Modal";

export type ResourceTaskStatus = {
    id: string;
    code: string;
    name: string;
    color: string;
    orderIndex: number;
    createdAt: Date | string;
    _count?: {
        tasks: number;
    };
};

interface ResourceTaskStatusesTableProps {
    refreshTrigger: number;
    onEdit: (status: ResourceTaskStatus) => void;
}

export default function ResourceTaskStatusesTable({ refreshTrigger, onEdit }: ResourceTaskStatusesTableProps) {
    const [statuses, setStatuses] = useState<ResourceTaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Delete Confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [statusToDelete, setStatusToDelete] = useState<ResourceTaskStatus | null>(null);

    useEffect(() => {
        fetchStatuses();
    }, [refreshTrigger, searchQuery]);

    async function fetchStatuses() {
        try {
            setLoading(true);
            const res = await getResourceTaskStatusesAction({ search: searchQuery });
            if (res.success && res.data) {
                setStatuses(res.data);
            } else {
                setError(res.message || "Failed to fetch statuses");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function initiateDelete(status: ResourceTaskStatus) {
        setStatusToDelete(status);
        setDeleteModalOpen(true);
    }

    async function handleDelete() {
        if (!statusToDelete) return;

        try {
            const res = await deleteResourceTaskStatusAction(statusToDelete.id);
            if (res.success) {
                fetchStatuses();
                setDeleteModalOpen(false);
                setStatusToDelete(null);
            } else {
                alert(res.message);
            }
        } catch (err: any) {
            alert(err.message);
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    if (loading && statuses.length === 0) return <div className="text-sm text-text-secondary p-4">Loading statuses...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Task Statuses
                    </h2>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search statuses..."
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
                            <th className="whitespace-nowrap px-3 py-3">Order</th>
                            <th className="whitespace-nowrap px-3 py-3">Code</th>
                            <th className="whitespace-nowrap px-3 py-3">Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Color</th>
                            <th className="whitespace-nowrap px-3 py-3">Tasks Count</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {statuses.map((status) => (
                            <tr key={status.id} className="text-text-secondary hover:bg-surface/50">
                                <td className="whitespace-nowrap px-3 py-3">
                                    {status.orderIndex}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                                    {status.code}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    {status.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-4 w-4 rounded-full border border-border"
                                            style={{ backgroundColor: status.color }}
                                        />
                                        <span className="text-xs">{status.color}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className="inline-flex items-center rounded-full bg-surface px-2 py-1 text-xs font-medium text-text-secondary">
                                        {status._count?.tasks || 0}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(status)}
                                            title="Edit Status"
                                            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                                        >
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => initiateDelete(status)}
                                            title="Delete Status"
                                            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-rose-50 hover:text-rose-600"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {statuses.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No statuses match your search." : "No statuses found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Task Status"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to delete the status
                        <span className="font-semibold text-text-primary"> "{statusToDelete?.name}"</span>?
                        {statusToDelete?._count?.tasks ? (
                            <span className="block mt-2 text-rose-600 bg-rose-50 p-2 rounded-lg text-xs">
                                Warning: This status is used by {statusToDelete._count.tasks} tasks.
                                You will need to reassign those tasks before deleting (or deletion will fail).
                            </span>
                        ) : null}
                    </p>
                    <div className="flex justify-end gap-3 mt-4">
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
