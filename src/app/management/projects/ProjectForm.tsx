"use client";

import { useState, useEffect } from "react";
import { createProjectAction, updateProjectAction } from "./actions";

type Project = {
    id?: string;
    name: string;
    code: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
};

type ProjectFormProps = {
    initialData?: Project;
    onSuccess: () => void;
    onCancel: () => void;
};

export default function ProjectForm({ initialData, onSuccess, onCancel }: ProjectFormProps) {
    const [formData, setFormData] = useState<Project>({
        name: "",
        code: "",
        description: "",
        startDate: null,
        endDate: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                code: initialData.code || "",
                description: initialData.description || "",
                startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : null,
                endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : null,
            });
        } else {
            setFormData({
                name: "",
                code: "",
                description: "",
                startDate: null,
                endDate: null,
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const payload: any = {
                name: formData.name,
                code: formData.code || null,
                description: formData.description || null,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            };

            let res;
            if (initialData?.id) {
                res = await updateProjectAction(initialData.id, payload);
            } else {
                res = await createProjectAction(payload);
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
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
                    Project Name *
                </label>
                <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Data Migration"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Project Code
                </label>
                <input
                    type="text"
                    name="code"
                    value={formData.code || ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. DM-2024"
                />
            </div>

            <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    Description
                </label>
                <textarea
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Project details..."
                    rows={3}
                />
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">
                        Start Date
                    </label>
                    <input
                        type="date"
                        name="startDate"
                        value={(formData.startDate as string) || ""}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">
                        End Date
                    </label>
                    <input
                        type="date"
                        name="endDate"
                        value={(formData.endDate as string) || ""}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
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
                    {loading ? "Saving..." : initialData?.id ? "Update Project" : "Create Project"}
                </button>
            </div>
        </form>
    );
}
