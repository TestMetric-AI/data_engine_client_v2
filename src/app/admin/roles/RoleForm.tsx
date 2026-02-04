"use client";

import { useState, useEffect } from "react";

type Role = {
    id?: string;
    name: string;
    description: string;
};

type RoleFormProps = {
    initialData?: Role;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function RoleForm({ initialData, onSuccess, onCancel }: RoleFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Reset form when initialData changes (for editing different items without closing modal)
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || "");
        } else {
            setName("");
            setDescription("");
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const method = initialData?.id ? "PATCH" : "POST";
            const body = initialData?.id
                ? { id: initialData.id, name, description }
                : { name, description };

            const res = await fetch("/api/admin/roles", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Role Name
                </label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. EDITOR"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Describe permissions for this role..."
                    rows={3}
                />
            </div>

            <div className="mt-4 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? "Saving..." : initialData ? "Update Role" : "Create Role"}
                </button>
            </div>
        </form>
    );
}
