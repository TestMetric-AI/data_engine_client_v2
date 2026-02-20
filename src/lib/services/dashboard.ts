import prisma from "@/lib/db";
import { turso } from "@/lib/turso";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { DEPOSITS_DP10_TABLE } from "./deposits";
import { DEPOSITS_LOCKED_TABLE } from "./deposits-locked";

export type DashboardStats = {
    activeProjects: number;
    taskCompletionRate: number;
    upcomingDeadlines: {
        id: string;
        title: string;
        dueDate: string | null;
        priority: string;
    }[];
    resourceUtilization: number;
    totalDepositsCount: number;
    totalLockedCount: number;
};

async function getDashboardStatsRaw(): Promise<DashboardStats> {
    // 1. Active Projects Count
    const activeProjects = await prisma.project.count({
        where: { isActive: true },
    });

    // 2. Task Completion Rate
    const totalTasks = await prisma.resourceTask.count();
    const completedTasks = await prisma.resourceTask.count({
        where: {
            OR: [
                { approvalStatus: "APPROVED" },
            ],
        },
    });

    const taskCompletionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    // 3. Upcoming Deadlines (High priority, next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcomingDeadlinesRaw = await prisma.resourceTask.findMany({
        where: {
            dueDate: {
                gte: today,
                lte: nextWeek,
            },
            approvalStatus: "PENDING",
        },
        select: {
            id: true,
            title: true,
            dueDate: true,
            priority: true,
        },
        orderBy: {
            dueDate: "asc",
        },
        take: 5,
    });

    const upcomingDeadlines = upcomingDeadlinesRaw.map(task => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        priority: task.priority,
    }));

    // 4. Resource Utilization
    const utilizationResult = await prisma.resource.aggregate({
        _avg: {
            allocationPercentage: true,
        },
        where: {
            active: true,
        },
    });

    const resourceUtilization = Math.round(utilizationResult._avg.allocationPercentage || 0);

    // 5. Turso Metrics
    let totalDepositsCount = 0;
    let totalLockedCount = 0;

    try {
        const depositsResult = await turso.execute(`SELECT COUNT(*) as count FROM ${DEPOSITS_DP10_TABLE}`);
        totalDepositsCount = Number(depositsResult.rows[0][0]);

        const lockedResult = await turso.execute(`SELECT COUNT(*) as count FROM ${DEPOSITS_LOCKED_TABLE}`);
        totalLockedCount = Number(lockedResult.rows[0][0]);
    } catch (error) {
        console.error("Error fetching Turso metrics:", error);
        // Fallback to 0 or handle error appropriately
    }

    return {
        activeProjects,
        taskCompletionRate,
        upcomingDeadlines,
        resourceUtilization,
        totalDepositsCount,
        totalLockedCount,
    };
}

const getCachedDashboardStats = unstable_cache(getDashboardStatsRaw, ["dashboard-stats"], {
    revalidate: 300,
    tags: [CACHE_TAGS.DASHBOARD],
});

export async function getDashboardStats(): Promise<DashboardStats> {
    return getCachedDashboardStats();
}
