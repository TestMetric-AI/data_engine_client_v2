import prisma from "@/lib/db";
import {
  createTestSuites,
  deleteTestSuiteById,
  listTestSuites,
  TestSuiteNotFoundError,
  updateTestSuiteById,
} from "../test-suites";
import { randomUUID } from "crypto";

jest.mock("crypto", () => ({
  randomUUID: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    testSuite: {
      findMany: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("TestSuites Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReset();
    let sequence = 0;
    (randomUUID as jest.Mock).mockImplementation(() => `uuid-${++sequence}`);
  });

  it("lists test suites with pagination and filters", async () => {
    const rows = [{ id: "1", testSuiteId: "suite-a" }];
    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue(rows);
    (prisma.testSuite.count as jest.Mock).mockResolvedValue(1);

    const result = await listTestSuites({
      page: 2,
      pageSize: 10,
      testSuiteId: "suite",
      specFile: "spec",
      testId: "case",
    });

    expect(prisma.testSuite.findMany).toHaveBeenCalledWith({
      where: {
        testSuiteId: { contains: "suite", mode: "insensitive" },
        specFile: { contains: "spec", mode: "insensitive" },
        testId: { contains: "case", mode: "insensitive" },
      },
      orderBy: { testSuiteId: "asc" },
      skip: 10,
      take: 10,
    });
    expect(result).toEqual({
      data: rows,
      total: 1,
      totalPages: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it("creates single payload and defaults tags", async () => {
    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.testSuite.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await createTestSuites({
      specFile: "file.spec.ts",
      testId: "t-1",
      testCaseName: "case 1",
    });

    expect(prisma.testSuite.createMany).toHaveBeenCalledWith({
      data: [
        {
          testSuiteId: "suite-uuid-1",
          specFile: "file.spec.ts",
          testId: "t-1",
          testCaseName: "case 1",
          testCaseTags: [],
        },
      ],
    });
    expect(result).toEqual({ count: 1, skipped: 0 });
  });

  it("creates batch payload", async () => {
    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.testSuite.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const result = await createTestSuites([
      {
        specFile: "a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      },
      {
        specFile: "b.spec.ts",
        testId: "t-2",
        testCaseName: "case 2",
        testCaseTags: ["smoke"],
      },
    ]);

    expect(prisma.testSuite.createMany).toHaveBeenCalledWith({
      data: [
        {
          testSuiteId: "suite-uuid-1",
          specFile: "a.spec.ts",
          testId: "t-1",
          testCaseName: "case 1",
          testCaseTags: [],
        },
        {
          testSuiteId: "suite-uuid-2",
          specFile: "b.spec.ts",
          testId: "t-2",
          testCaseName: "case 2",
          testCaseTags: ["smoke"],
        },
      ],
    });
    expect(result).toEqual({ count: 2, skipped: 0 });
  });

  it("skips duplicates from payload and existing rows", async () => {
    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([
      {
        specFile: "b.spec.ts",
        testId: "t-2",
        testCaseName: "case 2",
      },
    ]);
    (prisma.testSuite.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await createTestSuites([
      {
        specFile: "a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      },
      {
        specFile: "a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      },
      {
        specFile: "b.spec.ts",
        testId: "t-2",
        testCaseName: "case 2",
      },
    ]);

    expect(prisma.testSuite.createMany).toHaveBeenCalledWith({
      data: [
        {
          testSuiteId: "suite-uuid-1",
          specFile: "a.spec.ts",
          testId: "t-1",
          testCaseName: "case 1",
          testCaseTags: [],
        },
      ],
    });
    expect(result).toEqual({ count: 1, skipped: 2 });
  });

  it("returns zero created when all rows are duplicates", async () => {
    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([
      {
        specFile: "a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      },
    ]);

    const result = await createTestSuites([
      {
        specFile: "a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      },
      {
        specFile: "a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      },
    ]);

    expect(prisma.testSuite.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ count: 0, skipped: 2 });
  });

  it("updates by id when record exists", async () => {
    const updated = { id: "uuid", testCaseName: "updated" };
    (prisma.testSuite.findUnique as jest.Mock).mockResolvedValue({ id: "uuid" });
    (prisma.testSuite.update as jest.Mock).mockResolvedValue(updated);

    const result = await updateTestSuiteById("uuid", { testCaseName: "updated" });

    expect(prisma.testSuite.update).toHaveBeenCalledWith({
      where: { id: "uuid" },
      data: { testCaseName: "updated" },
    });
    expect(result).toEqual(updated);
  });

  it("throws not-found error when updating non-existent record", async () => {
    (prisma.testSuite.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateTestSuiteById("missing", { testCaseName: "x" })).rejects.toBeInstanceOf(
      TestSuiteNotFoundError
    );
  });

  it("deletes by id when record exists", async () => {
    (prisma.testSuite.findUnique as jest.Mock).mockResolvedValue({ id: "uuid" });
    (prisma.testSuite.delete as jest.Mock).mockResolvedValue({ id: "uuid" });

    const result = await deleteTestSuiteById("uuid");

    expect(prisma.testSuite.delete).toHaveBeenCalledWith({ where: { id: "uuid" } });
    expect(result).toEqual({ id: "uuid" });
  });

  it("throws not-found error when deleting non-existent record", async () => {
    (prisma.testSuite.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(deleteTestSuiteById("missing")).rejects.toBeInstanceOf(TestSuiteNotFoundError);
  });
});


