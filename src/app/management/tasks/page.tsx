
import { Suspense } from "react";
import { getResourceTasks } from "@/lib/services/resource-tasks";
import { getResourceTaskStatuses } from "@/lib/services/resource-task-statuses";
import { getProjects } from "@/lib/services/projects";
import { getResources } from "@/lib/services/resources";
import TasksClientPage from "./TasksClientPage";

export const dynamic = "force-dynamic";

interface TasksPageProps {
    searchParams: Promise<{
        search?: string;
        statusId?: string;
        projectId?: string;
        resourceId?: string;
    }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
    const { search, statusId, projectId, resourceId } = await searchParams;

    const [tasksData, statuses, projectsData, resourcesData, userContext] = await Promise.all([
        getResourceTasks({
            search,
            statusId,
            projectId,
            resourceId,
            pageSize: 50
        }),
        getResourceTaskStatuses(),
        getProjects({}),
        getResources({ pageSize: 100 }),
        (async () => {
            const { getServerSession } = await import("next-auth");
            const { authOptions } = await import("@/lib/auth");
            const prisma = (await import("@/lib/db")).default;

            const session = await getServerSession(authOptions);
            if (!session?.user) return { canApprove: false, currentResourceId: null, currentUserRole: null };

            const [canApprove, user] = await Promise.all([
                Promise.resolve(session.user.permissions?.includes("APPROVE_TASKS") ?? false),
                prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: {
                        resource: {
                            select: {
                                id: true,
                                role: { select: { name: true } }
                            }
                        }
                    }
                })
            ]);

            const isLead = user?.resource?.role?.name === "LEAD";

            return {
                canApprove: canApprove || isLead,
                currentResourceId: user?.resource?.id || null,
                currentUserRole: user?.resource?.role?.name || null
            };
        })()
    ]);

    const { canApprove, currentResourceId, currentUserRole } = userContext;

    return (
        <Suspense fallback={<div>Loading tasks...</div>}>
            <TasksClientPage
                tasks={tasksData.tasks.map((t: any) => ({
                    ...t,
                    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
                    actualHours: t.actualHours ? Number(t.actualHours) : null,
                }))}
                total={tasksData.total}
                statuses={statuses}
                projects={projectsData.projects}
                resources={resourcesData.resources as any}
                canApprove={Boolean(canApprove)}
                currentResourceId={currentResourceId}
                currentUserRole={currentUserRole}
            />
        </Suspense>
    );
}
