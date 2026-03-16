import { render, screen } from "@testing-library/react";
import TestResultsCharts from "../TestResultsCharts";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

describe("TestResultsCharts", () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockUsePathname.mockReturnValue("/dashboard/test-results");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("renders suite match donut card with metrics", () => {
    render(
      <TestResultsCharts
        data={{
          totalTests: 10,
          passRate: 80,
          avgDuration: 1200,
          totalFailures: 2,
          statusDistribution: [
            { status: "passed", count: 8 },
            { status: "failed", count: 2 },
          ],
          dailyTrend: [{ date: "2026-03-15", passed: 8, failed: 2, skipped: 0, total: 10 }],
          slowestTests: [],
          flakyTests: [],
          projectBreakdown: [],
          testFileHealth: [],
          suiteMatchDistribution: {
            matched: 7,
            unmatched: 3,
            total: 10,
            matchRate: 70,
          },
        }}
        filterOptions={{ projects: [], pipelines: [], environments: [] }}
        currentFilters={{}}
      />
    );

    expect(screen.getByText("Suite Match Coverage")).toBeInTheDocument();
    expect(screen.getByText("Match vs TestSuite cases (last 30 days)")).toBeInTheDocument();
    expect(screen.getByText("Match rate")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("No match")).toBeInTheDocument();
  });
});

