"use server";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { TestSuitesFilter, TestSuitesResult, TestSuiteRow } from "./types";
import { PAGE_SIZE } from "./types";

function getEmptyResult(): TestSuitesResult {
  return {
    rows: [],
    total: 0,
    totalPages: 0,
    testSuiteIds: [],
    specFiles: [],
    testIds: [],
  };
}

function isMissingTestSuitesTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    meta?: { table?: unknown } | unknown;
  };

  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const table =
    candidate.meta &&
    typeof candidate.meta === "object" &&
    "table" in candidate.meta &&
    typeof (candidate.meta as { table?: unknown }).table === "string"
      ? ((candidate.meta as { table: string }).table ?? "").toLowerCase()
      : "";

  if (code === "P2021" && table.includes("test_suites")) {
    return true;
  }

  return message.includes("test_suites") && message.includes("does not exist");
}

async function getTestSuitesRaw(filter: TestSuitesFilter): Promise<TestSuitesResult> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.TestSuiteWhereInput = {};

  if (filter.testSuiteId) {
    where.testSuiteId = filter.testSuiteId;
  }

  if (filter.specFile) {
    where.specFile = filter.specFile;
  }

  if (filter.testId) {
    where.testId = filter.testId;
  }

  if (filter.search) {
    where.OR = [
      { testCaseName: { contains: filter.search, mode: "insensitive" } },
      { specFile: { contains: filter.search, mode: "insensitive" } },
      { testId: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  try {
    const [results, total, testSuiteValues, specFileValues, testIdValues] = await Promise.all([
      prisma.testSuite.findMany({
        where,
        select: {
          id: true,
          testSuiteId: true,
          specFile: true,
          testId: true,
          testCaseName: true,
          testCaseTags: true,
        },
        orderBy: [{ testSuiteId: "asc" }, { testId: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.testSuite.count({ where }),
      prisma.testSuite.findMany({
        select: { testSuiteId: true },
        distinct: ["testSuiteId"],
        orderBy: { testSuiteId: "asc" },
      }),
      prisma.testSuite.findMany({
        select: { specFile: true },
        distinct: ["specFile"],
        orderBy: { specFile: "asc" },
      }),
      prisma.testSuite.findMany({
        select: { testId: true },
        distinct: ["testId"],
        orderBy: { testId: "asc" },
      }),
    ]);

    const rows: TestSuiteRow[] = results.map((r) => ({
      id: r.id,
      testSuiteId: r.testSuiteId,
      specFile: r.specFile,
      testId: r.testId,
      testCaseName: r.testCaseName,
      testCaseTags: r.testCaseTags,
    }));

    return {
      rows,
      total,
      totalPages: Math.ceil(total / pageSize),
      testSuiteIds: testSuiteValues.map((v) => v.testSuiteId).filter(Boolean),
      specFiles: specFileValues.map((v) => v.specFile).filter(Boolean),
      testIds: testIdValues.map((v) => v.testId).filter(Boolean),
    };
  } catch (error) {
    if (isMissingTestSuitesTableError(error)) {
      console.warn("[TestSuites] table public.test_suites not found. Returning empty dataset.");
      return getEmptyResult();
    }

    throw error;
  }
}

export async function getTestSuites(filter: TestSuitesFilter): Promise<TestSuitesResult> {
  const key = JSON.stringify(filter);
  const cachedGetter = unstable_cache(
    () => getTestSuitesRaw(filter),
    ["test-suites", key],
    {
      revalidate: 300,
      tags: [CACHE_TAGS.TEST_SUITES],
    }
  );
  return cachedGetter();
}
