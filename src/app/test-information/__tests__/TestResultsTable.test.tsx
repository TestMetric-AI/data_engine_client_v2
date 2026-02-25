
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TestResultsTable from "../TestResultsTable";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type TestResultRow } from "../types";

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
    useSearchParams: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

describe("TestResultsTable", () => {
    const defaultProps = {
        rows: [] as TestResultRow[],
        total: 0,
        totalPages: 0,
        currentPage: 1,
        currentPageSize: 10,
        projects: ["Project A", "Project B"],
        branches: ["main", "develop"],
        environments: ["dev", "staging", "prod"],
    };

    const sampleRow: TestResultRow = {
        id: "1",
        testTitle: "Sample Test",
        testStatus: "passed",
        duration: 1234,
        testFile: "src/tests/sample.test.ts",
        testProject: "Project A",
        retries: 0,
        retry: 0,
        tags: ["unit", "fast"],
        environment: "dev",
        pipelineId: "123",
        commitSha: "abc",
        branch: "main",
        runUrl: "http://example.com",
        provider: "github",
        createdAt: new Date().toISOString(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseRouter.mockReturnValue({ push: mockPush });
        mockUsePathname.mockReturnValue("/test-information");
        mockUseSearchParams.mockReturnValue({
            get: jest.fn().mockReturnValue(null),
            toString: jest.fn().mockReturnValue(""),
            entries: jest.fn().mockReturnValue([]),
            [Symbol.iterator]: jest.fn().mockReturnValue([][Symbol.iterator]())
        });
    });

    it("renders table with data", () => {
        render(<TestResultsTable {...defaultProps} rows={[sampleRow]} total={1} totalPages={1} />);

        expect(screen.getByText("Sample Test")).toBeInTheDocument();
        expect(screen.getByText("Passed")).toBeInTheDocument();
        expect(screen.getByText("1.2s")).toBeInTheDocument(); // 1234ms -> 1.2s
        expect(screen.getByText("Project A")).toBeInTheDocument();
    });

    it("displays empty state when no data", () => {
        render(<TestResultsTable {...defaultProps} />);

        expect(screen.getByText("No test results found.")).toBeInTheDocument();
    });

    it("updates URL on filter change", () => {
        render(<TestResultsTable {...defaultProps} />);

        // Open filters
        const filterButton = screen.getByText("Show filters");
        fireEvent.click(filterButton);

        // Change project filter
        // The filter structure is label > span + select. 
        // We can find by label text if the label is associated with control.
        // In the component: <label><span ...>Project</span><select ...></label>
        // This is implicit association.
        // However, getting by label text "Project" might be ambiguous if not handled correctly.
        // Let's use getByDisplayValue or similar if needed, but getByLabelText should work for implicit labels too in RTL.
        // Actually, let's look at the component code again.
        // <label key={key} className="flex flex-col gap-2 text-xs">
        //   <span className="font-semibold text-text-secondary">{label}</span>
        //   <select ...>
        // There is no `for` / `id` association, it's a wrapping label.
        // RTL's getByLabelText works with wrapping labels.

        const projectSelect = screen.getByLabelText(/Project/i);
        fireEvent.change(projectSelect, { target: { value: "Project A" } });

        // Apply filters
        const applyButton = screen.getByText("Apply filters");
        fireEvent.click(applyButton);

        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("project=Project+A"));
    });

    it("updates URL on pagination change", () => {
        render(<TestResultsTable {...defaultProps} total={20} totalPages={2} />);

        // Find next button (there are two, one top one bottom)
        const nextButtons = screen.getAllByText("Next");
        fireEvent.click(nextButtons[0]);

        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    });

    it("updates URL on search (debounced)", async () => {
        jest.useFakeTimers();
        render(<TestResultsTable {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search by title or file...");
        fireEvent.change(searchInput, { target: { value: "search term" } });

        // Fast forward time
        jest.advanceTimersByTime(500);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("search=search+term"));
        });

        jest.useRealTimers();
    });

    it("clears filters correctly", () => {
        render(<TestResultsTable {...defaultProps} />);

        // Open filters
        const showFiltersButton = screen.getByText("Show filters");
        fireEvent.click(showFiltersButton);

        // Click reset filters
        const clearButton = screen.getByText("Reset all");
        fireEvent.click(clearButton);

        expect(mockPush).toHaveBeenCalledWith("/test-information");
    });
});
