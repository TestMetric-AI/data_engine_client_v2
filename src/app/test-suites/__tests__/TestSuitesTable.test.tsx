import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/useCan";
import TestSuitesTable from "../TestSuitesTable";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("@/hooks/useCan", () => ({
  useCan: jest.fn(),
}));

const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUseCan = useCan as jest.Mock;

const mockPush = jest.fn();
const mockRefresh = jest.fn();

const baseProps = {
  rows: [],
  total: 0,
  totalPages: 1,
  currentPage: 1,
  currentPageSize: 10,
  testSuiteIds: ["suite-a"],
  specFiles: ["tests/a.spec.ts"],
  testIds: ["t-1"],
};

const propsWithRows = {
  ...baseProps,
  rows: [
    {
      id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124",
      testSuiteId: "suite-a",
      specFile: "tests/a.spec.ts",
      testId: "t-1",
      testCaseName: "case 1",
      testCaseTags: ["smoke"],
    },
  ],
  total: 1,
};

describe("TestSuitesTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush, refresh: mockRefresh });
    mockUsePathname.mockReturnValue("/test-suites");
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
      toString: jest.fn().mockReturnValue(""),
    });

    mockUseCan.mockReturnValue({
      can: () => true,
      loading: false,
    });

    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  it("hides Add records when user lacks permission", () => {
    mockUseCan.mockReturnValue({
      can: () => false,
      loading: false,
    });

    render(<TestSuitesTable {...baseProps} />);

    expect(screen.queryByText("Add records")).not.toBeInTheDocument();
  });

  it("creates single record via modal and refreshes table", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1, skipped: 0 }),
    });

    render(<TestSuitesTable {...baseProps} />);

    fireEvent.click(screen.getByText("Add records"));

    fireEvent.change(screen.getByLabelText("Create Spec file"), { target: { value: "tests/a.spec.ts" } });
    fireEvent.change(screen.getByLabelText("Create Test ID"), { target: { value: "t-1" } });
    fireEvent.change(screen.getByLabelText("Create Case name"), { target: { value: "case 1" } });
    fireEvent.change(screen.getByLabelText("Create Tags"), { target: { value: "smoke,regression" } });

    fireEvent.click(screen.getByText("Save records"));

    await waitFor(() => {
      const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      const parsedBody = JSON.parse(requestInit.body as string);
      expect(parsedBody).toMatchObject({
        specFile: "tests/a.spec.ts",
        testId: "t-1",
        testCaseName: "case 1",
      });
      expect(parsedBody.testSuiteId).toBeUndefined();
      expect(mockRefresh).toHaveBeenCalled();
    });

    expect(screen.getByText("Saved 1 record(s). Skipped 0 duplicate(s).")).toBeInTheDocument();
  });

  it("shows validation error for invalid bulk JSON", async () => {
    render(<TestSuitesTable {...baseProps} />);

    fireEvent.click(screen.getByText("Add records"));
    fireEvent.click(screen.getByText("Bulk JSON"));

    fireEvent.change(screen.getByLabelText("Bulk JSON"), { target: { value: "{invalid" } });
    fireEvent.click(screen.getByText("Save records"));

    expect(await screen.findByText("Bulk JSON is invalid. Please provide a valid JSON object or array.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("renders ACTIONS column and updates a row", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" }),
    });

    render(<TestSuitesTable {...propsWithRows} />);

    expect(screen.getByText("ACTIONS")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Edit record"));
    fireEvent.change(screen.getByLabelText("Edit Case name"), { target: { value: "case updated" } });
    fireEvent.click(screen.getByText("Save changes"));

    await waitFor(() => {
      const [requestUrl, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      expect(requestUrl).toBe("/api/test-suites/f7f137f3-6698-4dc6-9f89-80f6a1a6f124");
      expect(requestInit.method).toBe("PUT");
      expect(mockRefresh).toHaveBeenCalled();
    });

    expect(screen.getByText("Record updated successfully.")).toBeInTheDocument();
  });

  it("deletes a row from actions column", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "TestSuite deleted" }),
    });

    render(<TestSuitesTable {...propsWithRows} />);

    fireEvent.click(screen.getByTitle("Delete record"));
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      const [requestUrl, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      expect(requestUrl).toBe("/api/test-suites/f7f137f3-6698-4dc6-9f89-80f6a1a6f124");
      expect(requestInit.method).toBe("DELETE");
      expect(mockRefresh).toHaveBeenCalled();
    });

    expect(screen.getByText("Record deleted successfully.")).toBeInTheDocument();
  });
});
