import { getTestResults } from "../actions";
import prisma from "@/lib/db";
import { cleanupExpiredTestResults } from "@/lib/services/test-results-retention";

jest.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

jest.mock("@/lib/services/test-results-retention", () => ({
  cleanupExpiredTestResults: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    testResult: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    testSuite: {
      findMany: jest.fn(),
    },
  },
}));

describe("test-information/actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cleanupExpiredTestResults as jest.Mock).mockResolvedValue(undefined);
  });

  it("returns rows enriched with suite match metadata", async () => {
    (prisma.testResult.findMany as jest.Mock)
      .mockResolvedValueOnce([{ testProject: "chromium" }])
      .mockResolvedValueOnce([{ branch: "main" }])
      .mockResolvedValueOnce([{ environment: "qa" }])
      .mockResolvedValueOnce([
        {
          id: "r-1",
          testTitle: "flow > TC-100 - Valid login",
          testStatus: "passed",
          duration: 1000,
          testFile: "tests/auth/login.spec.ts",
          testProject: "chromium",
          retries: 0,
          retry: 0,
          tags: ["smoke"],
          environment: "qa",
          pipelineId: "p-1",
          commitSha: "abc",
          branch: "main",
          runUrl: "https://example.com",
          provider: "github",
          createdAt: new Date("2026-03-15T12:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          testTitle: "flow > TC-100 - Valid login",
          testFile: "tests/auth/login.spec.ts",
        },
      ]);

    (prisma.testResult.count as jest.Mock).mockResolvedValue(1);

    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([
      {
        id: "s-1",
        testSuiteId: "suite-1",
        specFile: "tests/auth/login.spec.ts",
        testId: "TC-100",
        testCaseName: "Valid login",
      },
    ]);

    const result = await getTestResults({ page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.matchedCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: "r-1",
      matched: true,
      matchedBy: "tc",
      matchedSuiteId: "suite-1",
      matchedSuiteTestId: "TC-100",
      matchedSuiteCaseName: "Valid login",
    });
  });

  it("returns unmatched metadata when no suite is found", async () => {
    (prisma.testResult.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "r-2",
          testTitle: "unknown case",
          testStatus: "failed",
          duration: 500,
          testFile: "tests/unknown.spec.ts",
          testProject: null,
          retries: 0,
          retry: 0,
          tags: [],
          environment: null,
          pipelineId: null,
          commitSha: null,
          branch: null,
          runUrl: null,
          provider: null,
          createdAt: new Date("2026-03-15T12:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          testTitle: "unknown case",
          testFile: "tests/unknown.spec.ts",
        },
      ]);

    (prisma.testResult.count as jest.Mock).mockResolvedValue(1);
    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getTestResults({ page: 1, pageSize: 10 });

    expect(result.matchedCount).toBe(0);
    expect(result.rows[0]).toMatchObject({
      id: "r-2",
      matched: false,
      matchedBy: null,
      matchedSuiteId: null,
      matchedSuiteTestId: null,
      matchedSuiteCaseName: null,
    });
  });

  it("filters to matched rows when matchedOnly is enabled", async () => {
    (prisma.testResult.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "r-1",
          testTitle: "TC-100 - Valid login",
          testStatus: "passed",
          duration: 1000,
          testFile: "tests/auth/login.spec.ts",
          testProject: "chromium",
          retries: 0,
          retry: 0,
          tags: [],
          environment: "qa",
          pipelineId: null,
          commitSha: null,
          branch: "main",
          runUrl: null,
          provider: null,
          createdAt: new Date("2026-03-15T12:00:00.000Z"),
        },
        {
          id: "r-2",
          testTitle: "TC-999 - Unknown",
          testStatus: "failed",
          duration: 1000,
          testFile: "tests/auth/login.spec.ts",
          testProject: "chromium",
          retries: 0,
          retry: 0,
          tags: [],
          environment: "qa",
          pipelineId: null,
          commitSha: null,
          branch: "main",
          runUrl: null,
          provider: null,
          createdAt: new Date("2026-03-15T12:00:00.000Z"),
        },
      ]);

    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([
      {
        id: "s-1",
        testSuiteId: "suite-1",
        specFile: "tests/auth/login.spec.ts",
        testId: "TC-100",
        testCaseName: "Valid login",
      },
    ]);

    const result = await getTestResults({ matchedOnly: true, page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.matchedCount).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe("r-1");
  });
});
