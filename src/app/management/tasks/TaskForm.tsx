"use client";

import { useState, useEffect } from "react";
import { createTaskAction, updateTaskAction } from "./taskActions";
import { ResourceTask, ResourceTaskStatus, Project, Resource } from "@/generated/prisma/client";

// Define simplified props or use existing types
type TaskWithDetails = ResourceTask & {
    status: ResourceTaskStatus;
    project: { name: string; id: string } | null;
    resource: { fullName: string; id: string } | null;
};

interface TaskFormProps {
    taskToEdit?: TaskWithDetails | null;
    statuses: ResourceTaskStatus[];
    projects: Project[];
    resources: Resource[];
    onSuccess: () => void;
    onCancel: () => void;
    currentResourceId?: string | null;
    currentUserRole?: string | null;
}

export default function TaskForm({ taskToEdit, statuses, projects, resources, onSuccess, onCancel, currentResourceId, currentUserRole }: TaskFormProps) {
    const [formData, setFormData] = useState({
        title: "",
        summary: "",
        resourceId: taskToEdit ? taskToEdit.resourceId : (currentResourceId || ""),
        projectId: "",
        statusId: "",
        priority: "medium",
        dueDate: "",
        estimatedHours: "",
        actualHours: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (taskToEdit) {
            setFormData({
                title: taskToEdit.title,
                summary: taskToEdit.summary || "",
                resourceId: taskToEdit.resourceId,
                projectId: taskToEdit.projectId || "",
                statusId: taskToEdit.statusId,
                priority: taskToEdit.priority,
                // Format date for inputs (YYYY-MM-DD)
                dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().split('T')[0] : "",
                estimatedHours: taskToEdit.estimatedHours ? String(taskToEdit.estimatedHours) : "",
                actualHours: taskToEdit.actualHours ? String(taskToEdit.actualHours) : "",
            });
        }
    }, [taskToEdit]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const payload: any = {
                title: formData.title,
                summary: formData.summary || null,
                resourceId: formData.resourceId,
                projectId: formData.projectId || null,
                statusId: formData.statusId,
                priority: formData.priority as any,
                dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
                actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
            };

            let res;
            if (taskToEdit) {
                res = await updateTaskAction(taskToEdit.id, payload);
            } else {
                res = await createTaskAction(payload);
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Title */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="title" className="text-xs font-semibold uppercase text-text-secondary">
                        Title
                    </label>
                    <input
                        id="title"
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        placeholder="Task title"
                    />
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="summary" className="text-xs font-semibold uppercase text-text-secondary">
                        Summary
                    </label>
                    <textarea
                        id="summary"
                        rows={3}
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        placeholder="Description..."
                    />
                </div>

                {/* Resource */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="resourceId" className="text-xs font-semibold uppercase text-text-secondary">
                        Assign To
                    </label>
                    <select
                        id="resourceId"
                        required
                        value={formData.resourceId}
                        onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
                        disabled={currentUserRole === "TESTER"}
                    >
                        <option value="">Select Resource</option>
                        {resources.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.fullName}</option>
                        ))}
                    </select>
                </div>

                {/* Project */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="projectId" className="text-xs font-semibold uppercase text-text-secondary">
                        Project
                    </label>
                    <select
                        id="projectId"
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                        <option value="">No Project</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="statusId" className="text-xs font-semibold uppercase text-text-secondary">
                        Status
                    </label>
                    <select
                        id="statusId"
                        required
                        value={formData.statusId}
                        onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                        <option value="">Select Status</option>
                        {statuses.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="priority" className="text-xs font-semibold uppercase text-text-secondary">
                        Priority
                    </label>
                    <select
                        id="priority"
                        required
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="dueDate" className="text-xs font-semibold uppercase text-text-secondary">
                        Due Date
                    </label>
                    <input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    />
                </div>

                {/* Hours */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="estimatedHours" className="text-xs font-semibold uppercase text-text-secondary">
                        Est. Hours
                    </label>
                    <input
                        id="estimatedHours"
                        type="number"
                        step="0.5"
                        value={formData.estimatedHours}
                        onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                    />
                </div>

            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
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
                    {loading ? "Saving..." : taskToEdit ? "Update Task" : "Create Task"}
                </button>
            </div>
        </form>
    );
}
