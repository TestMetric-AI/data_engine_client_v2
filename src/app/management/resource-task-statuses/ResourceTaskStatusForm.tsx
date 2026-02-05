"use client";

import { useState, useEffect } from "react";
import { createResourceTaskStatusAction, updateResourceTaskStatusAction } from "./actions";
import { ResourceTaskStatus } from "./ResourceTaskStatusesTable";

interface ResourceTaskStatusFormProps {
    statusToEdit?: ResourceTaskStatus | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function ResourceTaskStatusForm({ statusToEdit, onSuccess, onCancel }: ResourceTaskStatusFormProps) {
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        color: "#607d8b",
        orderIndex: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (statusToEdit) {
            setFormData({
                code: statusToEdit.code,
                name: statusToEdit.name,
                color: statusToEdit.color,
                orderIndex: statusToEdit.orderIndex,
            });
        }
    }, [statusToEdit]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            let res;
            if (statusToEdit) {
                res = await updateResourceTaskStatusAction(statusToEdit.id, formData);
            } else {
                // If creating, orderIndex might be ignored by backend auto-calc, but we send it anyway if user set it?
                // For simplicity, let's omit orderIndex if it's 0 (meaning user didn't care?)
                // Actually the backend logic handles undefined. Here we pass what we have.
                const { orderIndex, ...rest } = formData;
                res = await createResourceTaskStatusAction(statusToEdit ? formData : rest);
            }

            if (res.success) {
                onSuccess();
            } else {
                setError(res.message || "Operation failed");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="code" className="text-xs font-semibold uppercase text-text-secondary">
                        Code
                    </label>
                    <input
                        id="code"
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        placeholder="e.g. IN_PROGRESS"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-xs font-semibold uppercase text-text-secondary">
                        Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        placeholder="e.g. In Progress"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="color" className="text-xs font-semibold uppercase text-text-secondary">
                        Color
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="color"
                            type="color"
                            required
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-surface p-1"
                        />
                        <input
                            type="text"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="flex-1 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                            placeholder="#RRGGBB"
                        />
                    </div>
                </div>

                {statusToEdit && (
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="orderIndex" className="text-xs font-semibold uppercase text-text-secondary">
                            Order Index
                        </label>
                        <input
                            id="orderIndex"
                            type="number"
                            required
                            value={formData.orderIndex}
                            onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })}
                            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
                >
                    {loading ? "Saving..." : statusToEdit ? "Update Status" : "Create Status"}
                </button>
            </div>
        </form>
    );
}
