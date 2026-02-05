
import { Suspense } from "react";
import { getResourceTasks } from "@/lib/services/resource-tasks";
import { getResourceTaskStatuses } from "@/lib/services/resource-task-statuses";
import { getProjects } from "@/lib/services/projects";
import { getResources } from "@/lib/services/resources";
import TasksClientPage from "./TasksClientPage";

export const dynamic = "force-dynamic";

interface TasksPageProps {
    searchParams: {
        search?: string;
        statusId?: string;
        projectId?: string;
        resourceId?: string;
    };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
    const { search, statusId, projectId, resourceId } = searchParams;

    const [tasksData, statuses, projectsData, resourcesData] = await Promise.all([
        getResourceTasks({
            search,
            statusId,
            projectId,
            resourceId,
            pageSize: 50
        }),
        getResourceTaskStatuses(),
        getProjects({}),
        getResources({ pageSize: 100 })
    ]);

    return (
        <Suspense fallback={<div>Loading tasks...</div>}>
            <TasksClientPage
                tasks={tasksData.tasks as any}
                total={tasksData.total}
                statuses={statuses}
                projects={projectsData.projects}
                resources={resourcesData.resources as any}
            />
        </Suspense>
    );
}
