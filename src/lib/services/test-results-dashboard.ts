import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type DashboardFilters = {
    testProject?: string;
    pipelineId?: string;
    environment?: string;
};

export type StatusDistribution = {
    status: string;
    count: number;
};

export type DailyTrend = {
    date: string;
    passed: number;
    failed: number;
    skipped: number;
    total: number;
};

export type SlowestTest = {
    testTitle: string;
    testFile: string;
    avgDuration: number;
    maxDuration: number;
    runCount: number;
};

export type FlakyTest = {
    testTitle: string;
    testFile: string;
    totalRuns: number;
    passCount: number;
    failCount: number;
    flakyRate: number;
};

export type ProjectBreakdown = {
    project: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
};

export type TestResultsDashboardData = {
    totalTests: number;
    passRate: number;
    avgDuration: number;
    totalFailures: number;
    statusDistribution: StatusDistribution[];
    dailyTrend: DailyTrend[];
    slowestTests: SlowestTest[];
    flakyTests: FlakyTest[];
    projectBreakdown: ProjectBreakdown[];
    recentBranches: { branch: string; total: number; passed: number; failed: number }[];
};

export async function getDashboardFilterOptions() {
    const [projects, pipelines, environments] = await Promise.all([
        prisma.testResult.findMany({ select: { testProject: true }, distinct: ["testProject"], where: { testProject: { not: null } } }),
        prisma.testResult.findMany({ select: { pipelineId: true }, distinct: ["pipelineId"], where: { pipelineId: { not: null } } }),
        prisma.testResult.findMany({ select: { environment: true }, distinct: ["environment"], where: { environment: { not: null } } }),
    ]);
    return {
        projects: projects.map(p => p.testProject!).filter(Boolean).sort(),
        pipelines: pipelines.map(p => p.pipelineId!).filter(Boolean).sort(),
        environments: environments.map(e => e.environment!).filter(Boolean).sort(),
    };
}

export async function getTestResultsDashboardData(filters?: DashboardFilters): Promise<TestResultsDashboardData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build Prisma where clause with optional filters
    const baseWhere: Prisma.TestResultWhereInput = {
        createdAt: { gte: thirtyDaysAgo },
        ...(filters?.testProject && { testProject: filters.testProject }),
        ...(filters?.pipelineId && { pipelineId: filters.pipelineId }),
        ...(filters?.environment && { environment: filters.environment }),
    };

    // Build raw SQL WHERE clause with optional filters
    const conditions = [Prisma.sql`created_at >= ${thirtyDaysAgo}`];
    if (filters?.testProject) conditions.push(Prisma.sql`test_project = ${filters.testProject}`);
    if (filters?.pipelineId) conditions.push(Prisma.sql`pipeline_id = ${filters.pipelineId}`);
    if (filters?.environment) conditions.push(Prisma.sql`environment = ${filters.environment}`);
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    // Run all queries in parallel
    const [
        totalTests,
        totalFailures,
        avgDurationResult,
        statusCounts,
        dailyResults,
        slowestResults,
        flakyResults,
        projectResults,
        branchResults,
    ] = await Promise.all([
        // Total tests in last 30 days
        prisma.testResult.count({
            where: baseWhere,
        }),

        // Total failures
        prisma.testResult.count({
            where: { ...baseWhere, testStatus: "failed" },
        }),

        // Average duration
        prisma.testResult.aggregate({
            _avg: { duration: true },
            where: baseWhere,
        }),

        // Status distribution
        prisma.testResult.groupBy({
            by: ["testStatus"],
            _count: { id: true },
            where: baseWhere,
        }),

        // Daily trend (raw query for date grouping)
        prisma.$queryRaw<
            { date: Date; status: string; count: bigint }[]
        >`
            SELECT DATE(created_at) as date, test_status as status, COUNT(*)::int as count
            FROM test_results
            ${whereClause}
            GROUP BY DATE(created_at), test_status
            ORDER BY date ASC
        `,

        // Slowest tests (top 10 by avg duration)
        prisma.$queryRaw<
            { test_title: string; test_file: string; avg_duration: number; max_duration: number; run_count: bigint }[]
        >`
            SELECT test_title, test_file,
                   AVG(duration)::int as avg_duration,
                   MAX(duration)::int as max_duration,
                   COUNT(*)::int as run_count
            FROM test_results
            ${whereClause}
            GROUP BY test_title, test_file
            HAVING COUNT(*) >= 2
            ORDER BY avg_duration DESC
            LIMIT 10
        `,

        // Flaky tests (tests with both pass and fail in the period)
        prisma.$queryRaw<
            { test_title: string; test_file: string; total_runs: bigint; pass_count: bigint; fail_count: bigint }[]
        >`
            SELECT test_title, test_file,
                   COUNT(*)::int as total_runs,
                   COUNT(*) FILTER (WHERE test_status = 'passed')::int as pass_count,
                   COUNT(*) FILTER (WHERE test_status = 'failed')::int as fail_count
            FROM test_results
            ${whereClause}
            GROUP BY test_title, test_file
            HAVING COUNT(*) FILTER (WHERE test_status = 'passed') > 0
               AND COUNT(*) FILTER (WHERE test_status = 'failed') > 0
            ORDER BY COUNT(*) FILTER (WHERE test_status = 'failed')::float / COUNT(*) DESC
            LIMIT 10
        `,

        // Project breakdown
        prisma.$queryRaw<
            { project: string; total: bigint; passed: bigint; failed: bigint }[]
        >`
            SELECT COALESCE(test_project, 'No Project') as project,
                   COUNT(*)::int as total,
                   COUNT(*) FILTER (WHERE test_status = 'passed')::int as passed,
                   COUNT(*) FILTER (WHERE test_status = 'failed')::int as failed
            FROM test_results
            ${whereClause}
            GROUP BY test_project
            ORDER BY total DESC
            LIMIT 10
        `,

        // Recent branches
        prisma.$queryRaw<
            { branch: string; total: bigint; passed: bigint; failed: bigint }[]
        >`
            SELECT COALESCE(branch, 'unknown') as branch,
                   COUNT(*)::int as total,
                   COUNT(*) FILTER (WHERE test_status = 'passed')::int as passed,
                   COUNT(*) FILTER (WHERE test_status = 'failed')::int as failed
            FROM test_results
            ${whereClause} AND branch IS NOT NULL
            GROUP BY branch
            ORDER BY MAX(created_at) DESC
            LIMIT 8
        `,
    ]);

    // Process status distribution
    const statusDistribution: StatusDistribution[] = statusCounts.map((s) => ({
        status: s.testStatus,
        count: s._count.id,
    }));

    // Process daily trend
    const dailyMap = new Map<string, DailyTrend>();
    for (const row of dailyResults) {
        const dateStr = new Date(row.date).toISOString().split("T")[0];
        if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, { date: dateStr, passed: 0, failed: 0, skipped: 0, total: 0 });
        }
        const entry = dailyMap.get(dateStr)!;
        const count = Number(row.count);
        entry.total += count;
        if (row.status === "passed") entry.passed += count;
        else if (row.status === "failed") entry.failed += count;
        else if (row.status === "skipped") entry.skipped += count;
    }
    const dailyTrend = Array.from(dailyMap.values());

    // Process slowest tests
    const slowestTests: SlowestTest[] = slowestResults.map((r) => ({
        testTitle: r.test_title,
        testFile: r.test_file,
        avgDuration: Number(r.avg_duration),
        maxDuration: Number(r.max_duration),
        runCount: Number(r.run_count),
    }));

    // Process flaky tests
    const flakyTests: FlakyTest[] = flakyResults.map((r) => {
        const total = Number(r.total_runs);
        const fails = Number(r.fail_count);
        return {
            testTitle: r.test_title,
            testFile: r.test_file,
            totalRuns: total,
            passCount: Number(r.pass_count),
            failCount: fails,
            flakyRate: Math.round((fails / total) * 100),
        };
    });

    // Process project breakdown
    const projectBreakdown: ProjectBreakdown[] = projectResults.map((r) => {
        const total = Number(r.total);
        const passed = Number(r.passed);
        return {
            project: r.project,
            total,
            passed,
            failed: Number(r.failed),
            passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        };
    });

    // Process branches
    const recentBranches = branchResults.map((r) => ({
        branch: r.branch,
        total: Number(r.total),
        passed: Number(r.passed),
        failed: Number(r.failed),
    }));

    const passRate = totalTests > 0 ? Math.round(((totalTests - totalFailures) / totalTests) * 100) : 0;

    return {
        totalTests,
        passRate,
        avgDuration: Math.round(avgDurationResult._avg.duration || 0),
        totalFailures,
        statusDistribution,
        dailyTrend,
        slowestTests,
        flakyTests,
        projectBreakdown,
        recentBranches,
    };
}
