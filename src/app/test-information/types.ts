export const PAGE_SIZE = 10;

export const TEST_STATUS_OPTIONS = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "timedOut", label: "Timed Out" },
  { value: "skipped", label: "Skipped" },
  { value: "interrupted", label: "Interrupted" },
] as const;

export interface TestResultRow {
  id: string;
  testTitle: string;
  testStatus: string;
  duration: number;
  testFile: string;
  testProject: string | null;
  retries: number;
  retry: number;
  tags: string[];
  environment: string | null;
  pipelineId: string | null;
  commitSha: string | null;
  branch: string | null;
  runUrl: string | null;
  provider: string | null;
  createdAt: string; // ISO string
}

export interface TestResultsFilter {
  search?: string;
  status?: string;
  project?: string;
  branch?: string;
  environment?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface TestResultsResult {
  rows: TestResultRow[];
  total: number;
  totalPages: number;
  projects: string[];
  branches: string[];
  environments: string[];
}
