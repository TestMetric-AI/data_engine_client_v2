"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import Modal from "@/components/ui/Modal";
import { createDailyAction, getDailiesAction, deleteDailyAction } from "./dailyActions";
import { TrashIcon } from "@heroicons/react/24/outline";

interface TaskDailiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: { id: string; title: string } | null;
}

interface DailyItem {
    id: string;
    content: string;
    date: string | Date;
    resource: {
        fullName: string;
    };
}

export default function TaskDailiesModal({ isOpen, onClose, task }: TaskDailiesModalProps) {
    const [dailies, setDailies] = useState<DailyItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [deleteDailyModalOpen, setDeleteDailyModalOpen] = useState(false);
    const [dailyToDelete, setDailyToDelete] = useState<DailyItem | null>(null);

    const fetchDailies = useCallback(async () => {
        if (!task) return;
        setLoading(true);
        const res = await getDailiesAction(task.id);
        if (res.success) {
            setDailies(res.data);
        }
        setLoading(false);
    }, [task]);

    useEffect(() => {
        if (!isOpen || !task) return;
        const timer = window.setTimeout(() => {
            void fetchDailies();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [fetchDailies, isOpen, task]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!task || !content.trim()) return;

        setSubmitting(true);
        const res = await createDailyAction({
            taskId: task.id,
            content,
            date: new Date().toISOString()
        });

        if (res.success) {
            setContent("");
            fetchDailies();
        } else {
            alert(res.message);
        }
        setSubmitting(false);
    }

    function initiateDeleteDaily(daily: DailyItem) {
        setDailyToDelete(daily);
        setDeleteDailyModalOpen(true);
    }

    async function handleDelete() {
        if (!dailyToDelete) return;
        const res = await deleteDailyAction(dailyToDelete.id);
        if (res.success) {
            setDeleteDailyModalOpen(false);
            setDailyToDelete(null);
            fetchDailies();
        } else {
            alert(res.message);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Dailies: ${task?.title}`}>
            <div className="flex flex-col gap-6">
                {/* List */}
                <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <p className="text-sm text-text-secondary">Loading...</p>
                    ) : dailies.length === 0 ? (
                        <p className="text-sm text-text-secondary">No dailies recorded yet.</p>
                    ) : (
                        dailies.map((daily) => (
                            <div key={daily.id} className="rounded-xl border border-border bg-surface p-3 transition hover:border-primary/50">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-text-primary">
                                            {daily.resource.fullName}
                                        </span>
                                        <span className="text-[10px] text-text-secondary">
                                            {format(new Date(daily.date), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => initiateDeleteDaily(daily)}
                                        className="text-text-secondary hover:text-rose-600"
                                        title="Delete Daily"
                                    >
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-sm text-text-primary whitespace-pre-wrap">{daily.content}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border pt-4">
                    <label className="text-xs font-semibold uppercase text-text-secondary">New Daily Update</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                        placeholder="What did you work on today?"
                        rows={3}
                        required
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
                        >
                            {submitting ? "Saving..." : "Post Update"}
                        </button>
                    </div>
                </form>
            </div>

            <Modal
                isOpen={deleteDailyModalOpen}
                onClose={() => {
                    setDeleteDailyModalOpen(false);
                    setDailyToDelete(null);
                }}
                title="Delete Daily"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-text-secondary">
                        Are you sure you want to delete this daily update?
                    </p>
                    <div className="mt-2 flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setDeleteDailyModalOpen(false);
                                setDailyToDelete(null);
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
}
