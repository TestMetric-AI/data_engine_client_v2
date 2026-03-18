
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
        page?: string;
        pageSize?: string;
    }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
    const { search, statusId, projectId, resourceId, page, pageSize } = await searchParams;
    const parsedPage = Number.parseInt(page ?? "1", 10);
    const parsedPageSize = Number.parseInt(pageSize ?? "10", 10);
    const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const currentPageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : 10;

    const [tasksData, statuses, projectsData, resourcesData, userContext] = await Promise.all([
        getResourceTasks({
            search,
            statusId,
            projectId,
            resourceId,
            page: currentPage,
            pageSize: currentPageSize,
        }),
        getResourceTaskStatuses(),
        getProjects({}),
        getResources({ pageSize: 100 }),
        (async () => {
            const { getServerSession } = await import("next-auth");
            const { authOptions } = await import("@/lib/auth");
            const prisma = (await import("@/lib/db")).default;

            const session = await getServerSession(authOptions);
            if (!session?.user) return { canApprove: false, canManageTaskStatuses: false, currentResourceId: null, currentUserRole: null };

            const [canApprove, canManageTaskStatuses, user] = await Promise.all([
                Promise.resolve(session.user.permissions?.includes("APPROVE_TASKS") ?? false),
                Promise.resolve(session.user.permissions?.includes("MANAGE_TASK_STATUSES") ?? false),
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
                canManageTaskStatuses: canManageTaskStatuses || session.user.roles?.includes("ADMIN") || false,
                currentResourceId: user?.resource?.id || null,
                currentUserRole: user?.resource?.role?.name || null
            };
        })()
    ]);

    const { canApprove, canManageTaskStatuses, currentResourceId, currentUserRole } = userContext;
    const mappedTasks = tasksData.tasks.map((t) => ({
        ...t,
        estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
        actualHours: t.actualHours ? Number(t.actualHours) : null,
    }));

    return (
        <Suspense fallback={<div>Loading tasks...</div>}>
            <TasksClientPage
                tasks={mappedTasks}
                total={tasksData.total}
                statuses={statuses}
                projects={projectsData.projects}
                resources={resourcesData.resources}
                currentPage={currentPage}
                currentPageSize={currentPageSize}
                totalPages={tasksData.totalPages}
                canApprove={Boolean(canApprove)}
                canManageTaskStatuses={Boolean(canManageTaskStatuses)}
                currentResourceId={currentResourceId}
                currentUserRole={currentUserRole}
            />
        </Suspense>
    );
}
