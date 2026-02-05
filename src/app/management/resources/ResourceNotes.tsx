"use client";

import { useState, useRef, useEffect } from "react";
import { createResourceNoteAction, deleteResourceNoteAction } from "./actions-notes";
import { UserCircleIcon, TrashIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

type ResourceNote = {
    id: string;
    note: string;
    createdAt: Date | string;
    author: {
        id: string;
        fullName: string;
        user: {
            email: string;
            name: string | null;
        };
    } | null;
};

interface ResourceNotesProps {
    resourceId: string;
    notes: ResourceNote[];
    currentUserId?: string; // To check permissions for deletion?
}

export default function ResourceNotes({ resourceId, notes: initialNotes }: ResourceNotesProps) {
    // We rely on parent to pass initial notes, but we might want to refresh or manage state locally too.
    // Ideally parent fetches and passes down, but for simple "add and refetch" we can trigger router refresh 
    // or just use optimisitic updates.
    // Since actions revalidatePath, parent server component will re-render and pass new props if this is server component child.
    // Wait, this is a client component. If parent is server component and passes data, `router.refresh()` is needed.

    const [noteContent, setNoteContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // We won't manage full notes state here if we rely on server revalidation and parent re-render.
    // But for better UX, we might want to fetch?
    // Let's assume parent (page.tsx) fetches and passes data. 
    // When we add/delete, we call action -> revalidatePath -> router.refresh() (if we were using router).
    // Actually `revalidatePath` on server re-renders the path on next navigation/refresh.
    // To see changes immediately without full page reload, we might need `useRouter`.

    const [localNotes, setLocalNotes] = useState<ResourceNote[]>(initialNotes);

    useEffect(() => {
        setLocalNotes(initialNotes);
    }, [initialNotes]);

    async function handleAddNote(e: React.FormEvent) {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await createResourceNoteAction(resourceId, noteContent);
            if (res.success) {
                setNoteContent("");
                // Optimization: fetch notes or just wait for parent re-render?
                // We'll rely on parent re-render but trigger a refresh if needed?
                // Actually server actions with revalidatePath usually handle this if it's a form submission...
                // But this is client side call.
            } else {
                alert(res.message);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteNote(noteId: string) {
        if (!confirm("Delete this note?")) return;
        try {
            const res = await deleteResourceNoteAction(noteId, resourceId);
            if (!res.success) {
                alert(res.message);
            }
        } catch (err: any) {
            alert(err.message);
        }
    }

    return (
        <div className="flex flex-col gap-6 h-full">
            <h3 className="font-display text-lg font-semibold text-text-primary">
                Notes & Activity
            </h3>

            {/* List */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-[300px] max-h-[500px] pr-2">
                {localNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-text-secondary rounded-xl bg-surface/50 border border-border border-dashed">
                        <p>No notes yet.</p>
                    </div>
                ) : (
                    localNotes.map((note) => (
                        <div key={note.id} className="flex gap-3 group relative">
                            <div className="flex-shrink-0 mt-1">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="text-xs font-bold">
                                        {note.author?.fullName?.charAt(0) || "?"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 rounded-2xl rounded-tl-none bg-surface p-4 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-text-primary">
                                        {note.author?.fullName || "Unknown"}
                                    </span>
                                    <span className="text-xs text-text-secondary">
                                        {new Date(note.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-text-secondary whitespace-pre-wrap">{note.note}</p>
                            </div>
                            <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-rose-600 transition"
                                title="Delete Note"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Form */}
            <form onSubmit={handleAddNote} className="relative mt-2">
                <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Type a note..."
                    className="w-full rounded-xl border border-border bg-surface p-4 pr-12 text-sm text-text-primary focus:border-primary focus:outline-none min-h-[100px] resize-none"
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !noteContent.trim()}
                    className="absolute bottom-4 right-4 rounded-lg bg-primary p-2 text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                >
                    <PaperAirplaneIcon className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
