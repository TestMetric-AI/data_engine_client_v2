"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PowerIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

type Role = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    _count?: {
        users: number;
    };
};

interface RolesTableProps {
    refreshTrigger: number;
    onEdit: (role: Role) => void;
}

export default function RolesTable({ refreshTrigger, onEdit }: RolesTableProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function fetchRoles() {
            try {
                setLoading(true);
                const res = await fetch("/api/admin/roles");
                if (!res.ok) throw new Error("Failed to fetch roles");
                const data = await res.json();
                setRoles(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchRoles();
    }, [refreshTrigger]);

    async function toggleStatus(roleId: string, currentStatus: boolean) {
        if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this role?`)) return;

        try {
            const res = await fetch("/api/admin/roles", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: roleId, isActive: !currentStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            setRoles(prev => prev.map(r => r.id === roleId ? { ...r, isActive: !currentStatus } : r));
        } catch (err: any) {
            alert(err.message);
        }
    }

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (role.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    if (loading) return <div className="text-sm text-text-secondary p-4">Loading roles...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Roles List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        {filteredRoles.length} roles
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search roles..."
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
                            <th className="whitespace-nowrap px-3 py-3">Role Name</th>
                            <th className="whitespace-nowrap px-3 py-3">Description</th>
                            <th className="whitespace-nowrap px-3 py-3">Users</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3">Created</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredRoles.map((role) => (
                            <tr key={role.id} className="text-text-secondary hover:bg-surface/50">
                                <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                                    {role.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    {role.description || "-"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                                        {role._count?.users || 0}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${role.isActive
                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                        : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                        }`}>
                                        {role.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-text-secondary">
                                    {new Date(role.createdAt).toLocaleDateString()}
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
                                            onClick={() => toggleStatus(role.id, role.isActive)}
                                            title={role.isActive ? "Deactivate Role" : "Activate Role"}
                                            className={`rounded-lg p-2 transition-colors ${role.isActive
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
                        {filteredRoles.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No roles match your search." : "No roles found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
