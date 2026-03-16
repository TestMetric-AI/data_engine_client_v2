"use server";

import prisma from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { TestResultsFilter, TestResultsResult, TestResultRow } from "./types";
import { PAGE_SIZE } from "./types";
import { cleanupExpiredTestResults } from "@/lib/services/test-results-retention";
import { createTestSuiteMatcher } from "@/lib/services/test-result-suite-matcher";

type TestResultMatchSeed = {
  testTitle: string;
  testFile: string;
};

type TestResultSelectedRow = {
  id: string;
  testTitle: string;
  testStatus: string;
  duration: number;
  testFile: string;
  testProject: string | null;
  retries: number;
  retry: number;
  tags: string[];
  environment: string | null;
  pipelineId: string | null;
  commitSha: string | null;
  branch: string | null;
  runUrl: string | null;
  provider: string | null;
  createdAt: Date;
};

type TestSuiteRow = {
  id: string;
  testSuiteId: string;
  specFile: string;
  testId: string;
  testCaseName: string;
};

function countMatches(rows: TestResultMatchSeed[], suites: TestSuiteRow[]): number {
  const matchSuite = createTestSuiteMatcher(suites);

  return rows.reduce((acc, row) => {
    return matchSuite({ testTitle: row.testTitle, testFile: row.testFile }) ? acc + 1 : acc;
  }, 0);
}

function enrichRowsWithMatch(rows: TestResultSelectedRow[], suites: TestSuiteRow[]): TestResultRow[] {
  const matchSuite = createTestSuiteMatcher(suites);

  return rows.map((r) => {
    const match = matchSuite({ testTitle: r.testTitle, testFile: r.testFile });

    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      matched: Boolean(match),
      matchedBy: match?.matchedBy ?? null,
      matchedSuiteId: match?.suite.testSuiteId ?? null,
      matchedSuiteTestId: match?.suite.testId ?? null,
      matchedSuiteCaseName: match?.suite.testCaseName ?? null,
    };
  });
}

async function getTestResultsRaw(filter: TestResultsFilter): Promise<TestResultsResult> {
  await cleanupExpiredTestResults();

  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.TestResultWhereInput = {};

  if (filter.status) {
    where.testStatus = filter.status;
  }

  if (filter.project) {
    where.testProject = filter.project;
  }

  if (filter.branch) {
    where.branch = filter.branch;
  }

  if (filter.environment) {
    where.environment = filter.environment;
  }

  if (filter.search) {
    where.OR = [
      { testTitle: { contains: filter.search, mode: "insensitive" } },
      { testFile: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  if (filter.dateFrom || filter.dateTo) {
    where.createdAt = {};
    if (filter.dateFrom) {
      where.createdAt.gte = new Date(filter.dateFrom);
    }
    if (filter.dateTo) {
      where.createdAt.lte = new Date(filter.dateTo + "T23:59:59.999Z");
    }
  }

  const [projectValues, branchValues, environmentValues, suiteRows] = await Promise.all([
    prisma.testResult.findMany({
      select: { testProject: true },
      distinct: ["testProject"],
      where: { testProject: { not: null } },
    }),
    prisma.testResult.findMany({
      select: { branch: true },
      distinct: ["branch"],
      where: { branch: { not: null } },
    }),
    prisma.testResult.findMany({
      select: { environment: true },
      distinct: ["environment"],
      where: { environment: { not: null } },
    }),
    prisma.testSuite.findMany({
      select: {
        id: true,
        testSuiteId: true,
        specFile: true,
        testId: true,
        testCaseName: true,
      },
    }),
  ]);

  if (filter.matchedOnly) {
    const allResults = await prisma.testResult.findMany({
      where,
      select: {
        id: true,
        testTitle: true,
        testStatus: true,
        duration: true,
        testFile: true,
        testProject: true,
        retries: true,
        retry: true,
        tags: true,
        environment: true,
        pipelineId: true,
        commitSha: true,
        branch: true,
        runUrl: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = enrichRowsWithMatch(allResults, suiteRows);
    const matchedOnlyRows = enriched.filter((r) => r.matched);
    const total = matchedOnlyRows.length;

    return {
      rows: matchedOnlyRows.slice(skip, skip + pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
      matchedCount: total,
      projects: projectValues.map((p) => p.testProject!).filter(Boolean).sort(),
      branches: branchValues.map((b) => b.branch!).filter(Boolean).sort(),
      environments: environmentValues.map((e) => e.environment!).filter(Boolean).sort(),
    };
  }

  const [results, total, matchCountRows] = await Promise.all([
    prisma.testResult.findMany({
      where,
      select: {
        id: true,
        testTitle: true,
        testStatus: true,
        duration: true,
        testFile: true,
        testProject: true,
        retries: true,
        retry: true,
        tags: true,
        environment: true,
        pipelineId: true,
        commitSha: true,
        branch: true,
        runUrl: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.testResult.count({ where }),
    prisma.testResult.findMany({
      where,
      select: {
        testTitle: true,
        testFile: true,
      },
    }),
  ]);

  const rows = enrichRowsWithMatch(results, suiteRows);
  const matchedCount = countMatches(matchCountRows, suiteRows);

  return {
    rows,
    total,
    totalPages: Math.ceil(total / pageSize),
    matchedCount,
    projects: projectValues.map((p) => p.testProject!).filter(Boolean).sort(),
    branches: branchValues.map((b) => b.branch!).filter(Boolean).sort(),
    environments: environmentValues.map((e) => e.environment!).filter(Boolean).sort(),
  };
}

export async function getTestResults(filter: TestResultsFilter): Promise<TestResultsResult> {
  const key = JSON.stringify(filter);
  const cachedGetter = unstable_cache(
    () => getTestResultsRaw(filter),
    ["test-information", key],
    {
      revalidate: 300,
      tags: [CACHE_TAGS.TEST_INFORMATION],
    }
  );
  return cachedGetter();
}
