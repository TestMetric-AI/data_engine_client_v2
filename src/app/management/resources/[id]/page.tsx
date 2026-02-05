import { notFound } from "next/navigation";
import { getResourceById } from "@/lib/services/resources";
import { getResourceNotes } from "@/lib/services/resource-notes";
import { getResourceTasks } from "@/lib/services/resource-tasks";
import ResourceNotes from "../ResourceNotes";
import ResourceTasksList from "../ResourceTasksList";
import Link from "next/link";

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
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 h-full min-h-0">
                {/* Main Content: Tasks */}
                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
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
            </div>
        </div>
    );
}
