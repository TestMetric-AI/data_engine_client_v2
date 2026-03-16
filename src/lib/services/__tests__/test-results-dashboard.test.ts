import { TextDecoder, TextEncoder } from "util";
import prisma from "@/lib/db";
import { cleanupExpiredTestResults } from "../test-results-retention";

global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

jest.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

jest.mock("../test-results-retention", () => ({
  cleanupExpiredTestResults: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    testResult: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    testSuite: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

const { getTestResultsDashboardData } = jest.requireActual("../test-results-dashboard") as typeof import("../test-results-dashboard");

describe("test-results-dashboard service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cleanupExpiredTestResults as jest.Mock).mockResolvedValue(undefined);
  });

  it("calculates suite match distribution correctly", async () => {
    (prisma.testResult.count as jest.Mock)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    (prisma.testResult.aggregate as jest.Mock).mockResolvedValue({ _avg: { duration: 1000 } });

    (prisma.testResult.groupBy as jest.Mock).mockResolvedValue([
      { testStatus: "passed", _count: { id: 2 } },
      { testStatus: "failed", _count: { id: 1 } },
    ]);

    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    (prisma.testResult.findMany as jest.Mock).mockResolvedValue([
      { testTitle: "flow > TC-100 - Login", testFile: "tests/auth.spec.ts" },
      { testTitle: "Manual fallback case", testFile: "tests/auth.spec.ts" },
      { testTitle: "TC-999 - Unknown", testFile: "tests/auth.spec.ts" },
    ]);

    (prisma.testSuite.findMany as jest.Mock).mockResolvedValue([
      {
        id: "s1",
        testSuiteId: "suite-1",
        specFile: "tests/auth.spec.ts",
        testId: "TC-100",
        testCaseName: "Login",
      },
      {
        id: "s2",
        testSuiteId: "suite-2",
        specFile: "tests/auth.spec.ts",
        testId: "OTHER",
        testCaseName: "manual fallback case",
      },
    ]);

    const result = await getTestResultsDashboardData();

    expect(result.suiteMatchDistribution).toEqual({
      matched: 2,
      unmatched: 1,
      total: 3,
      matchRate: 67,
    });
  });
});
