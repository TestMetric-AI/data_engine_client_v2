"use client";

import { ResourceTask, ResourceTaskStatus, Project } from "@/generated/prisma/client";
import { format } from "date-fns";

// Extended type with relations
type TaskWithRelations = ResourceTask & {
    status: ResourceTaskStatus;
    project: { name: string } | null; // We only use name
};

interface ResourceTasksListProps {
    tasks: TaskWithRelations[];
}

export default function ResourceTasksList({ tasks }: ResourceTasksListProps) {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-text-secondary rounded-xl bg-surface/50 border border-border border-dashed h-full">
                <p>No tasks assigned.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="border-b border-border bg-surface text-xs uppercase text-text-secondary">
                        <tr>
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Project</th>
                            <th className="px-4 py-3 font-medium">Priority</th>
                            <th className="px-4 py-3 font-medium">Due Date</th>
                            <th className="px-4 py-3 font-medium">Est. Hours</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tasks.map((task) => (
                            <tr key={task.id} className="group hover:bg-surface/50 transition">
                                <td className="px-4 py-3 font-medium text-text-primary">
                                    {task.title}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                        style={{ backgroundColor: task.status.color }}
                                    >
                                        {task.status.name}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
                                    {task.project?.name || "-"}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize
                                        ${task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
                                     `}>
                                        {task.priority}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
                                    {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                                </td>
                                <td className="px-4 py-3 text-text-secondary">
                                    {task.estimatedHours?.toString() || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
