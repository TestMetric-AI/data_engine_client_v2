import { Suspense } from "react";
import { getTestResults } from "./actions";
import TestResultsTable from "@/app/test-information/TestResultsTable";
import { PAGE_SIZE } from "./types";

export const revalidate = 300;

interface TestInformationPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    project?: string;
    branch?: string;
    environment?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function TestInformationPage({ searchParams }: TestInformationPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : PAGE_SIZE;

  const data = await getTestResults({
    search: params.search,
    status: params.status,
    project: params.project,
    branch: params.branch,
    environment: params.environment,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page,
    pageSize,
  });

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      }
    >
      <TestResultsTable
        rows={data.rows}
        total={data.total}
        totalPages={data.totalPages}
        currentPage={page}
        currentPageSize={pageSize}
        projects={data.projects}
        branches={data.branches}
        environments={data.environments}
      />
    </Suspense>
  );
}
