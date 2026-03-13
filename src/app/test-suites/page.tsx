import { Suspense } from "react";
import { getTestSuites } from "./actions";
import TestSuitesTable from "./TestSuitesTable";
import { PAGE_SIZE } from "./types";

export const revalidate = 300;

interface TestSuitesPageProps {
  searchParams: Promise<{
    search?: string;
    testSuiteId?: string;
    specFile?: string;
    testId?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function TestSuitesPage({ searchParams }: TestSuitesPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : PAGE_SIZE;

  const data = await getTestSuites({
    search: params.search,
    testSuiteId: params.testSuiteId,
    specFile: params.specFile,
    testId: params.testId,
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
      <TestSuitesTable
        rows={data.rows}
        total={data.total}
        totalPages={data.totalPages}
        currentPage={page}
        currentPageSize={pageSize}
        testSuiteIds={data.testSuiteIds}
        specFiles={data.specFiles}
        testIds={data.testIds}
      />
    </Suspense>
  );
}
