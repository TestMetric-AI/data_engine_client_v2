import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

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
  testSuiteId: string;
  specFile: string;
  testId: string;
  testCaseName: string;
  testCaseTags?: string[];
};

export type TestSuiteUpdatePayload = Partial<TestSuiteCreatePayload>;

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
) {
  const rows = (Array.isArray(payload) ? payload : [payload]).map((item) => ({
    ...item,
    testCaseTags: item.testCaseTags ?? [],
  }));

  return prisma.testSuite.createMany({
    data: rows,
  });
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
