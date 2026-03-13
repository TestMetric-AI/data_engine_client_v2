export const PAGE_SIZE = 10;

export interface TestSuiteRow {
  id: string;
  testSuiteId: string;
  specFile: string;
  testId: string;
  testCaseName: string;
  testCaseTags: string[];
}

export interface TestSuitesFilter {
  search?: string;
  testSuiteId?: string;
  specFile?: string;
  testId?: string;
  page?: number;
  pageSize?: number;
}

export interface TestSuitesResult {
  rows: TestSuiteRow[];
  total: number;
  totalPages: number;
  testSuiteIds: string[];
  specFiles: string[];
  testIds: string[];
}
