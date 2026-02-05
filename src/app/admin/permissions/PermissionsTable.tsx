"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PowerIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

type Permission = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    _count?: {
        roles: number;
    };
};

interface PermissionsTableProps {
    refreshTrigger: number;
    onEdit: (permission: Permission) => void;
}

export default function PermissionsTable({ refreshTrigger, onEdit }: PermissionsTableProps) {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function fetchPermissions() {
            try {
                setLoading(true);
                const res = await fetch("/api/admin/permissions");
                if (!res.ok) throw new Error("Failed to fetch permissions");
                const data = await res.json();
                setPermissions(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchPermissions();
    }, [refreshTrigger]);

    async function toggleStatus(permissionId: string, currentStatus: boolean) {
        if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this permission?`)) return;

        try {
            const res = await fetch("/api/admin/permissions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: permissionId, isActive: !currentStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            setPermissions(prev => prev.map(p => p.id === permissionId ? { ...p, isActive: !currentStatus } : p));
        } catch (err: any) {
            alert(err.message);
        }
    }

    const filteredPermissions = permissions.filter(permission =>
        permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (permission.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    if (loading) return <div className="text-sm text-text-secondary p-4">Loading permissions...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Permissions List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        {filteredPermissions.length} permissions
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search permissions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                            <th className="whitespace-nowrap px-3 py-3">Permission Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Description</th>
                            <th className="whitespace-nowrap px-3 py-3">Roles</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3">Created</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredPermissions.map((permission) => (
                            <tr key={permission.id} className="text-text-secondary hover:bg-surface/50">
                                <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                                    {permission.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    {permission.description || "-"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                                        {permission._count?.roles || 0}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${permission.isActive
                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                        : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                        }`}>
                                        {permission.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-text-secondary">
                                    {new Date(permission.createdAt).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(permission)}
                                            title="Edit Permission"
                                            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                                        >
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(permission.id, permission.isActive)}
                                            title={permission.isActive ? "Deactivate Permission" : "Activate Permission"}
                                            className={`rounded-lg p-2 transition-colors ${permission.isActive
                                                ? "text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                                                : "text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                }`}
                                        >
                                            <PowerIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredPermissions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No permissions match your search." : "No permissions found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
