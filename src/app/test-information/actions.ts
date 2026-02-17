"use server";

import prisma from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { TestResultsFilter, TestResultsResult, TestResultRow } from "./types";
import { PAGE_SIZE } from "./types";

export async function getTestResults(filter: TestResultsFilter): Promise<TestResultsResult> {
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

  const [results, total, projectValues, branchValues, environmentValues] = await Promise.all([
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
  ]);

  const rows: TestResultRow[] = results.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    rows,
    total,
    totalPages: Math.ceil(total / pageSize),
    projects: projectValues.map((p) => p.testProject!).filter(Boolean).sort(),
    branches: branchValues.map((b) => b.branch!).filter(Boolean).sort(),
    environments: environmentValues.map((e) => e.environment!).filter(Boolean).sort(),
  };
}
