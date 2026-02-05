"use client";

import { useEffect, useState } from "react";
import { createResourceAction, updateResourceAction, getFormDataAction } from "./actions";

type ResourceFormData = {
    userId: string;
    fullName: string;
    roleId: string;
    allocationPercentage: number;
    active: boolean; // Not typically in form, defaults to true or managed by table
};

interface ResourceFormProps {
    initialData?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function ResourceForm({ initialData, onSuccess, onCancel }: ResourceFormProps) {
    const [formData, setFormData] = useState<ResourceFormData>({
        userId: "",
        fullName: "",
        roleId: "",
        allocationPercentage: 100,
        active: true,
    });

    const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
    const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadData() {
            setLoadingData(true);
            const res = await getFormDataAction();
            if (res.success && res.data) {
                setUsers(res.data.users);
                setRoles(res.data.roles);
            } else {
                setError(res.message || "Failed to load form data");
            }
            setLoadingData(false);
        }
        loadData();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                userId: initialData.userId,
                fullName: initialData.fullName,
                roleId: initialData.roleId || "",
                allocationPercentage: initialData.allocationPercentage,
                active: initialData.active,
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "allocationPercentage" ? parseInt(value) || 0 : value,
        }));

        // Auto-fill Full Name if User is selected and Full Name is empty (only for new records)
        if (name === "userId" && !initialData) {
            const selectedUser = users.find((u) => u.id === value);
            if (selectedUser && selectedUser.name) {
                setFormData((prev) => ({
                    ...prev,
                    fullName: selectedUser.name!,
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            // Basic validation
            if (!formData.userId) {
                setError("Please select a user.");
                setSaving(false);
                return;
            }
            if (!formData.fullName.trim()) {
                setError("Full name is required.");
                setSaving(false);
                return;
            }

            const payload: any = {
                fullName: formData.fullName,
                allocationPercentage: formData.allocationPercentage,
                role: formData.roleId ? { connect: { id: formData.roleId } } : undefined,
            };

            // Only connect user on create, logic for update assumes user doesn't change
            if (!initialData) {
                payload.user = { connect: { id: formData.userId } };
            }

            let res;
            if (initialData) {
                // Update
                // We don't update userId on edit based on requirement/assumptions
                res = await updateResourceAction(initialData.id, payload);
            } else {
                // Create
                res = await createResourceAction(payload);
            }

            if (res.success) {
                onSuccess();
            } else {
                setError(res.message || "Operation failed");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loadingData) return <div className="p-4 text-sm text-text-secondary">Loading form data...</div>;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-100">
                    {error}
                </div>
            )}

            {/* User Selection */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="userId" className="text-sm font-medium text-text-secondary">
                    User
                </label>
                {initialData ? (
                    <input
                        type="text"
                        value={initialData.user?.email || "Unknown User"}
                        disabled
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary cursor-not-allowed"
                    />
                ) : (
                    <select
                        name="userId"
                        id="userId"
                        value={formData.userId}
                        onChange={handleChange}
                        required
                        className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-0"
                    >
                        <option value="">Select a user...</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name ? `${user.name} (${user.email})` : user.email}
                            </option>
                        ))}
                    </select>
                )}
                {!initialData && (
                    <p className="text-xs text-text-secondary">
                        Only active users not currently assigned as resources are listed.
                    </p>
                )}
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-sm font-medium text-text-secondary">
                    Display Name
                </label>
                <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    maxLength={100} // Arbitrary max length
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-0"
                />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="roleId" className="text-sm font-medium text-text-secondary">
                    Resource Role
                </label>
                <select
                    name="roleId"
                    id="roleId"
                    value={formData.roleId}
                    onChange={handleChange}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-0"
                >
                    <option value="">No Role</option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Allocation */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="allocationPercentage" className="text-sm font-medium text-text-secondary">
                    Allocation (%)
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        name="allocationPercentage"
                        id="allocationPercentage"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.allocationPercentage}
                        onChange={handleChange}
                        className="h-2 w-full cursor-pointer rounded-lg bg-surface appearance-none accent-primary"
                    />
                    <span className="w-12 text-right text-sm font-semibold text-text-primary">
                        {formData.allocationPercentage}%
                    </span>
                </div>
            </div>

            <div className="mt-4 flex justify-end gap-3 border-t border-border pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Resource"}
                </button>
            </div>
        </form>
    );
}
