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
import Modal from "@/components/ui/Modal";

export default function UsersTable({ refreshTrigger }: { refreshTrigger: number }) {
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);
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



    const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
    const [editingUser, setEditingUser] = useState<{ id: string; name: string; roles: string[] } | null>(null);

    useEffect(() => {
        async function fetchRoles() {
            try {
                const res = await fetch("/api/admin/roles");
                if (res.ok) {
                    const data = await res.json();
                    setAvailableRoles(data);
                }
            } catch (error) {
                console.error("Failed to fetch roles", error);
            }
        }
        fetchRoles();
    }, []);

    const [pendingToggle, setPendingToggle] = useState<{ id: string; currentStatus: boolean; name: string } | null>(null);

    function initiateToggle(user: User) {
        setPendingToggle({
            id: user.id,
            currentStatus: user.isActive,
            name: user.name || user.email
        });
    }

    async function confirmToggle() {
        if (!pendingToggle) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: pendingToggle.id, isActive: !pendingToggle.currentStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            // Optimistic update
            setUsers(prev => prev.map(u => u.id === pendingToggle.id ? { ...u, isActive: !pendingToggle.currentStatus } : u));
            setPendingToggle(null);
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleUpdateRoles() {
        if (!editingUser) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: editingUser.id, roles: editingUser.roles }),
            });

            if (!res.ok) throw new Error("Failed to update roles");

            const updatedUser = await res.json();

            setUsers(prev => prev.map(u =>
                u.id === editingUser.id ? { ...u, roles: updatedUser.roles } : u
            ));
            setEditingUser(null);
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
            {/* Same header... */}
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
                                    <div className="flex flex-wrap gap-1 items-center">
                                        {user.roles.map((r) => (
                                            <span key={r.name} className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-primary">
                                                {r.name}
                                            </span>
                                        ))}
                                        <button
                                            onClick={() => setEditingUser({ id: user.id, name: user.name || "", roles: user.roles.map(r => r.name) })}
                                            className="ml-2 text-primary hover:text-primary/80 text-xs font-semibold underline"
                                        >
                                            Edit
                                        </button>
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
                                        onClick={() => initiateToggle(user)}
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

            {/* Toggle Status Modal */}
            <Modal
                isOpen={!!pendingToggle}
                onClose={() => setPendingToggle(null)}
                title={pendingToggle?.currentStatus ? "Deactivate User" : "Activate User"}
            >
                <div className="space-y-4">
                    <p className="text-text-secondary">
                        Are you sure you want to <strong>{pendingToggle?.currentStatus ? "deactivate" : "activate"}</strong> the user <strong>{pendingToggle?.name}</strong>?
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setPendingToggle(null)}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmToggle}
                            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm ${pendingToggle?.currentStatus
                                ? "bg-rose-600 hover:bg-rose-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                        >
                            {pendingToggle?.currentStatus ? "Deactivate" : "Activate"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Roles Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Edit User Roles"
            >
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                        Select roles for <strong>{editingUser?.name}</strong>:
                    </p>
                    <div className="flex flex-col gap-2">
                        {availableRoles.map(role => (
                            <label key={role.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editingUser?.roles.includes(role.name) || false}
                                    onChange={(e) => {
                                        if (!editingUser) return;
                                        const newRoles = e.target.checked
                                            ? [...editingUser.roles, role.name]
                                            : editingUser.roles.filter(r => r !== role.name);
                                        setEditingUser({ ...editingUser, roles: newRoles });
                                    }}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-text-primary">{role.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                        <button
                            onClick={() => setEditingUser(null)}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdateRoles}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
