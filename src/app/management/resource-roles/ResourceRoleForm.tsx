"use client";

import { useEffect, useState } from "react";
import { createResourceRoleAction, updateResourceRoleAction } from "./actions";

type ResourceRoleFormData = {
    name: string;
    description: string;
};

interface ResourceRoleFormProps {
    initialData?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function ResourceRoleForm({ initialData, onSuccess, onCancel }: ResourceRoleFormProps) {
    const [formData, setFormData] = useState<ResourceRoleFormData>({
        name: "",
        description: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                description: initialData.description || "",
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            if (!formData.name.trim()) {
                setError("Role name is required.");
                setSaving(false);
                return;
            }

            let res;
            if (initialData) {
                res = await updateResourceRoleAction(initialData.id, formData);
            } else {
                res = await createResourceRoleAction(formData);
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

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-100">
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-text-secondary">
                    Role Name
                </label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-0"
                    placeholder="e.g. Senior Developer"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium text-text-secondary">
                    Description
                </label>
                <textarea
                    name="description"
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-0 resize-none"
                    placeholder="Optional description..."
                />
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
                    {saving ? "Saving..." : "Save Role"}
                </button>
            </div>
        </form>
    );
}
