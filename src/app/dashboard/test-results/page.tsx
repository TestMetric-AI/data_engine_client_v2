import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import TestResultsCharts from "@/components/dashboard/TestResultsCharts";
import { getTestResultsDashboardData, getDashboardFilterOptions } from "@/lib/services/test-results-dashboard";
import type { DashboardFilters } from "@/lib/services/test-results-dashboard";

export const revalidate = 300;

export default async function TestResultsDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ testProject?: string; pipelineId?: string; environment?: string }>;
}) {
    const params = await searchParams;
    const filters: DashboardFilters = {
        ...(params.testProject && { testProject: params.testProject }),
        ...(params.pipelineId && { pipelineId: params.pipelineId }),
        ...(params.environment && { environment: params.environment }),
    };

    const [testResultsData, filterOptions] = await Promise.all([
        getTestResultsDashboardData(filters),
        getDashboardFilterOptions(),
    ]);

    return (
        <div className="min-h-screen bg-background">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="mb-6">
                            <p className="text-sm font-semibold text-text-secondary">Dashboard</p>
                            <h1 className="font-display text-2xl font-bold text-text-primary">
                                Test Results
                            </h1>
                            <p className="text-sm text-text-secondary">
                                CI/CD test results analytics and trends.
                            </p>
                        </div>

                        <TestResultsCharts
                            data={testResultsData}
                            filterOptions={filterOptions}
                            currentFilters={filters}
                        />
                    </main>
                </div>
            </div>
        </div>
    );
}
