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

import { MagnifyingGlassIcon, PowerIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";

export default function UsersTable({ refreshTrigger }: { refreshTrigger: number }) {
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);

    // ... existing state ...

    // ... existing fetchUsers ...

    // ... existing toggleStatus ...

    // ... existing filteredUsers ...

    // ... existing loading/error checks ...


    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

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

            // Optimistic update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
        } catch (err: any) {
            alert(err.message);
        }
    }

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="text-sm text-text-secondary p-4">Loading users...</div>;
    if (error) return <div className="text-sm text-rose-500 p-4">Error: {error}</div>;

    return (
        <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                        Users List
                    </h2>
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                        {filteredUsers.length} users
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-xl border border-border bg-surface px-4 py-2 pl-10 text-sm text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-0 w-full sm:w-64"
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
                            <th className="whitespace-nowrap px-3 py-3">User</th>
                            <th className="whitespace-nowrap px-3 py-3">Role</th>
                            <th className="whitespace-nowrap px-3 py-3">Status</th>
                            <th className="whitespace-nowrap px-3 py-3">Created</th>
                            <th className="whitespace-nowrap px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="border-b border-border text-text-secondary hover:bg-surface/50">
                                <td className="whitespace-nowrap px-3 py-3">
                                    <div className="font-medium text-text-primary">{user.name || "Unnamed"}</div>
                                    <div className="text-text-secondary text-xs">{user.email}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3">
                                    <div className="flex gap-1">
                                        {user.roles.map((r) => (
                                            <span key={r.name} className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-primary">
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
                                <td className="whitespace-nowrap px-3 py-3 text-text-secondary">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <button
                                        onClick={() => toggleStatus(user.id, user.isActive)}
                                        disabled={session?.user?.email === user.email}
                                        title={session?.user?.email === user.email ? "You cannot change your own status" : (user.isActive ? "Deactivate User" : "Activate User")}
                                        className={`rounded-lg p-2 transition-colors ${session?.user?.email === user.email
                                            ? "cursor-not-allowed opacity-30 text-text-secondary"
                                            : user.isActive
                                                ? "text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                                                : "text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                                            }`}
                                    >
                                        <PowerIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-3 py-10 text-center text-sm text-text-secondary">
                                    {searchQuery ? "No users match your search." : "No users found."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
