"use client";

import { useEffect, useState } from "react";

type User = {
    id: string;
    name: string | null;
    email: string;
    roles: { name: string }[];
    isActive: boolean;
    createdAt: string;
};

export default function UsersTable({ refreshTrigger }: { refreshTrigger: number }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchUsers() {
            try {
                setLoading(true);
                const res = await fetch("/api/admin/users");
                if (!res.ok) throw new Error("Failed to fetch users");
                const data = await res.json();
                setUsers(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, [refreshTrigger]);

    async function toggleStatus(userId: string, currentStatus: boolean) {
        if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this user?`)) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, isActive: !currentStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            // Optimistic update or refresh
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
        } catch (err: any) {
            alert(err.message);
        }
    }

    if (loading) return <div className="text-sm text-slate-500 p-4">Loading users...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                    Users List
                </h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {users.length} users
                </span>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                        <tr>
                            <th className="whitespace-nowrap px-3 py-3">User</th>
                            <th className="whitespace-nowrap px-3 py-3">Role</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3">Created</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-slate-50 text-slate-600 hover:bg-slate-50/50">
                                <td className="whitespace-nowrap px-3 py-3">
                                    <div className="font-medium text-slate-900">{user.name || "Unnamed"}</div>
                                    <div className="text-slate-500 text-xs">{user.email}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <div className="flex gap-1">
                                        {user.roles.map((r) => (
                                            <span key={r.name} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                {r.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive
                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                            : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                        }`}>
                                        {user.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <button
                                        onClick={() => toggleStatus(user.id, user.isActive)}
                                        className={`text-xs font-medium hover:underline ${user.isActive ? "text-rose-600" : "text-emerald-600"}`}
                                    >
                                        {user.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
