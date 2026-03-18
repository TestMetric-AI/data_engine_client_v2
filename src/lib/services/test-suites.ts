import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { randomUUID } from "crypto";

export class TestSuiteNotFoundError extends Error {
  constructor(message = "TestSuite not found.") {
    super(message);
    this.name = "TestSuiteNotFoundError";
  }
}

export type ListTestSuitesParams = {
  page?: number;
  pageSize?: number;
  testSuiteId?: string;
  specFile?: string;
  testId?: string;
};

export type TestSuiteCreatePayload = {
  specFile: string;
  testId: string;
  testCaseName: string;
  testCaseTags?: string[];
};

export type TestSuiteUpdatePayload = Partial<TestSuiteCreatePayload>;

type NormalizedTestSuiteCreateInput = {
  specFile: string;
  testId: string;
  testCaseName: string;
  testCaseTags: string[];
};

function buildWhere(filters: ListTestSuitesParams): Prisma.TestSuiteWhereInput {
  const where: Prisma.TestSuiteWhereInput = {};

  if (filters.testSuiteId) {
    where.testSuiteId = { contains: filters.testSuiteId, mode: "insensitive" };
  }

  if (filters.specFile) {
    where.specFile = { contains: filters.specFile, mode: "insensitive" };
  }

  if (filters.testId) {
    where.testId = { contains: filters.testId, mode: "insensitive" };
  }

  return where;
}

function buildDedupKey(row: {
  specFile: string;
  testId: string;
  testCaseName: string;
}): string {
  return [row.specFile, row.testId, row.testCaseName].join("::");
}

export async function listTestSuites({
  page = 1,
  pageSize = 50,
  testSuiteId,
  specFile,
  testId,
}: ListTestSuitesParams) {
  const skip = (page - 1) * pageSize;
  const where = buildWhere({ testSuiteId, specFile, testId });

  const [data, total] = await Promise.all([
    prisma.testSuite.findMany({
      where,
      orderBy: { testSuiteId: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.testSuite.count({ where }),
  ]);

  return {
    data,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
    pageSize,
  };
}

export async function createTestSuites(
  payload: TestSuiteCreatePayload | TestSuiteCreatePayload[]
): Promise<{ count: number; skipped: number }> {
  const inputRows: NormalizedTestSuiteCreateInput[] = (
    Array.isArray(payload) ? payload : [payload]
  ).map((item) => ({
    ...item,
    testCaseTags: item.testCaseTags ?? [],
  }));

  const totalInput = inputRows.length;
  const uniqueRows: NormalizedTestSuiteCreateInput[] = [];
  const payloadKeys = new Set<string>();

  for (const row of inputRows) {
    const key = buildDedupKey(row);
    if (payloadKeys.has(key)) {
      continue;
    }

    payloadKeys.add(key);
    uniqueRows.push(row);
  }

  if (uniqueRows.length === 0) {
    return { count: 0, skipped: totalInput };
  }

  const existingRows = await prisma.testSuite.findMany({
    where: {
      OR: uniqueRows.map((row) => ({
        specFile: row.specFile,
        testId: row.testId,
        testCaseName: row.testCaseName,
      })),
    },
    select: {
      specFile: true,
      testId: true,
      testCaseName: true,
    },
  });

  const existingKeys = new Set(existingRows.map((row) => buildDedupKey(row)));
  const rowsToInsert = uniqueRows.filter((row) => !existingKeys.has(buildDedupKey(row)));

  if (rowsToInsert.length === 0) {
    return { count: 0, skipped: totalInput };
  }

  const { count } = await prisma.testSuite.createMany({
    data: rowsToInsert.map((row) => ({
      ...row,
      testSuiteId: `suite-${randomUUID()}`,
    })),
  });

  return {
    count,
    skipped: totalInput - count,
  };
}

export async function updateTestSuiteById(id: string, data: TestSuiteUpdatePayload) {
  const existing = await prisma.testSuite.findUnique({ where: { id } });

  if (!existing) {
    throw new TestSuiteNotFoundError();
  }

  return prisma.testSuite.update({
    where: { id },
    data: {
      ...data,
      ...(data.testCaseTags ? { testCaseTags: data.testCaseTags } : {}),
    },
  });
}

export async function deleteTestSuiteById(id: string) {
  const existing = await prisma.testSuite.findUnique({ where: { id } });

  if (!existing) {
    throw new TestSuiteNotFoundError();
  }

  return prisma.testSuite.delete({
    where: { id },
  });
}
