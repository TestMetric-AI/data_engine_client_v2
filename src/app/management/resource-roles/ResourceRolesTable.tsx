"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PencilSquareIcon, PowerIcon } from "@heroicons/react/24/outline";
import { getResourceRolesAction, toggleResourceRoleStatusAction } from "./actions";
import Modal from "@/components/ui/Modal";

export type ResourceRole = {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date | string;
    isActive: boolean;
    _count?: {
        resources: number;
    };
};

interface ResourceRolesTableProps {
    refreshTrigger: number;
    onEdit: (role: ResourceRole) => void;
}

export default function ResourceRolesTable({ refreshTrigger, onEdit }: ResourceRolesTableProps) {
    const [roles, setRoles] = useState<ResourceRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Status Toggle Confirmation
    const [toggleModalOpen, setToggleModalOpen] = useState(false);
    const [roleToToggle, setRoleToToggle] = useState<ResourceRole | null>(null);

    const pageSize = 10;

    useEffect(() => {
        fetchRoles();
    }, [refreshTrigger, page, searchQuery]);

    async function fetchRoles() {
        try {
            setLoading(true);
            const res = await getResourceRolesAction({ page, pageSize, search: searchQuery });
            if (res.success && res.data) {
                setRoles(res.data.roles);
                setTotalPages(res.data.totalPages);
            } else {
                setError(res.message || "Failed to fetch roles");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function initiateToggleStatus(role: ResourceRole) {
        setRoleToToggle(role);
        setToggleModalOpen(true);
    }

    async function handleToggleStatus() {
        if (!roleToToggle) return;

        try {
            const newStatus = !roleToToggle.isActive;
            const res = await toggleResourceRoleStatusAction(roleToToggle.id, newStatus);
            if (res.success) {
                fetchRoles();
                setToggleModalOpen(false);
                setRoleToToggle(null);
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

    if (loading && roles.length === 0) return <div className="text-sm text-text-secondary p-4">Loading roles...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Roles List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        Total Pages: {totalPages}
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search roles..."
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
                            <th className="whitespace-nowrap px-3 py-3">Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Description</th>
                            <th className="whitespace-nowrap px-3 py-3">Resources Count</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {roles.map((role) => (
                            <tr key={role.id} className="text-text-secondary hover:bg-surface/50">
                                <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                                    {role.name}
                                </td>
                                <td className="px-3 py-3 max-w-xs truncate" title={role.description || ""}>
                                    {role.description || "-"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className="inline-flex items-center rounded-full bg-surface px-2 py-1 text-xs font-medium text-text-secondary">
                                        {role._count?.resources || 0}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${role.isActive
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-surface text-text-secondary"
                                            }`}
                                    >
                                        {role.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(role)}
                                            title="Edit Role"
                                            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                                        >
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => initiateToggleStatus(role)}
                                            title={role.isActive ? "Deactivate Role" : "Activate Role"}
                                            className={`rounded-lg p-2 transition-colors ${role.isActive
                                                    ? "text-emerald-600 hover:bg-emerald-50"
                                                    : "text-text-secondary hover:bg-surface"
                                                }`}
                                        >
                                            <PowerIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {roles.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No roles match your search." : "No roles found."}
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

            {/* Toggle Status Modal */}
            <Modal
                isOpen={toggleModalOpen}
                onClose={() => setToggleModalOpen(false)}
                title={roleToToggle?.isActive ? "Deactivate Resource Role" : "Activate Resource Role"}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to {roleToToggle?.isActive ? "deactivate" : "activate"} the role
                        <span className="font-semibold text-text-primary"> "{roleToToggle?.name}"</span>?
                    </p>
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={() => setToggleModalOpen(false)}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleToggleStatus}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${roleToToggle?.isActive
                                    ? "bg-rose-600 hover:bg-rose-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
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
