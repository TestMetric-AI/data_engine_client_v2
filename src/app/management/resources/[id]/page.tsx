import { notFound } from "next/navigation";
import { getResourceById } from "@/lib/services/resources";
import { getResourceNotes } from "@/lib/services/resource-notes";
import { getResourceTasks } from "@/lib/services/resource-tasks";
import ResourceNotes from "../ResourceNotes";
import ResourceTasksList from "../ResourceTasksList";
import Link from "next/link";
import { ArrowLeftIcon, UserCircleIcon, BriefcaseIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface PageProps {
    params: {
        id: string;
    };
}

export default async function ResourceDetailPage({ params }: PageProps) {
    const { id } = params;

    const [resource, notes, tasksData] = await Promise.all([
        getResourceById(id),
        getResourceNotes(id),
        getResourceTasks({ resourceId: id, pageSize: 50 }), // Fetch recent tasks
    ]);

    if (!resource) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/management/resources"
                    className="flex items-center gap-2 text-sm text-text-secondary transition hover:text-text-primary w-fit"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span>Back to Resources</span>
                </Link>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-text-secondary">
                            {/* Avatar placeholder */}
                            <UserCircleIcon className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="font-display text-2xl font-bold text-text-primary">
                                {resource.fullName}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                                <span className="flex items-center gap-1.5 bg-surface px-2 py-0.5 rounded-md border border-border">
                                    <BriefcaseIcon className="h-4 w-4" />
                                    {resource.role?.name || "No Role"}
                                </span>
                                <span>
                                    {resource.active ? (
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                                            Inactive
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
                {/* Main Content: Tasks */}
                <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
                    <section className="rounded-2xl border border-border bg-card p-6 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-display text-lg font-semibold text-text-primary">
                                Assigned Tasks
                            </h2>
                            {/* <button className="text-sm font-semibold text-primary hover:underline">
                                View All
                            </button> */}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <ResourceTasksList tasks={tasksData.tasks} />
                        </div>
                    </section>
                </div>

                {/* Sidebar: Notes */}
                <div className="flex flex-col gap-6 min-h-0">
                    <section className="rounded-2xl border border-border bg-card p-6 flex-1 flex flex-col min-h-0 h-[600px]">
                        <ResourceNotes resourceId={resource.id} notes={notes} />
                    </section>
                </div>
            </div>
        </div>
    );
}
