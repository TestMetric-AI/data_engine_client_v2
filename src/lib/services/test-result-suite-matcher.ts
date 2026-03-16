export type MatchMethod = "tc" | "caseName";

export type TestSuiteCandidate = {
  id: string;
  testSuiteId: string;
  specFile: string;
  testId: string;
  testCaseName: string;
};

export type TestResultMatchInput = {
  testTitle: string;
  testFile: string;
};

export type TestSuiteMatch = {
  matched: true;
  matchedBy: MatchMethod;
  suite: TestSuiteCandidate;
};

type TestSuiteCandidateWithDerived = TestSuiteCandidate & {
  normalizedSpecFile: string;
  normalizedCaseName: string;
  caseCode: string | null;
};

const TC_PATTERN = /\bTC(?:\s*-\s*|\s*)?(\d+)\b/i;
const NUMERIC_ID_PATTERN = /^\s*(\d+)\s*$/;

export function normalizeMatchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSpecFile(value: string): string {
  return normalizeMatchText(value).replace(/\\/g, "/");
}

export function extractTestCaseCode(value: string): string | null {
  const match = value.match(TC_PATTERN);
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return String(parsed);
  }

  const numericMatch = value.match(NUMERIC_ID_PATTERN);
  if (!numericMatch) {
    return null;
  }

  const parsed = Number.parseInt(numericMatch[1], 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return String(parsed);
}

function sortCandidates(a: TestSuiteCandidateWithDerived, b: TestSuiteCandidateWithDerived): number {
  return a.id.localeCompare(b.id);
}

export function createTestSuiteMatcher(candidates: TestSuiteCandidate[]) {
  const prepared = candidates.map<TestSuiteCandidateWithDerived>((item) => ({
    ...item,
    normalizedSpecFile: normalizeSpecFile(item.specFile),
    normalizedCaseName: normalizeMatchText(item.testCaseName),
    caseCode: extractTestCaseCode(item.testId),
  }));

  const byCaseCode = new Map<string, TestSuiteCandidateWithDerived[]>();
  const byCaseName = new Map<string, TestSuiteCandidateWithDerived[]>();

  for (const candidate of prepared) {
    if (candidate.caseCode) {
      const list = byCaseCode.get(candidate.caseCode) ?? [];
      list.push(candidate);
      byCaseCode.set(candidate.caseCode, list);
    }

    const byName = byCaseName.get(candidate.normalizedCaseName) ?? [];
    byName.push(candidate);
    byCaseName.set(candidate.normalizedCaseName, byName);
  }

  const pickBestCandidate = (
    list: TestSuiteCandidateWithDerived[],
    normalizedTestFile: string
  ): TestSuiteCandidateWithDerived | null => {
    if (list.length === 0) {
      return null;
    }

    const specMatches = list.filter((item) => item.normalizedSpecFile === normalizedTestFile);
    const source = specMatches.length > 0 ? specMatches : list;
    return [...source].sort(sortCandidates)[0] ?? null;
  };

  return ({ testTitle, testFile }: TestResultMatchInput): TestSuiteMatch | null => {
    const normalizedTitle = normalizeMatchText(testTitle);
    const normalizedTestFile = normalizeSpecFile(testFile);
    const titleCaseCode = extractTestCaseCode(testTitle);

    if (titleCaseCode) {
      const tcCandidates = byCaseCode.get(titleCaseCode) ?? [];
      const matched = pickBestCandidate(tcCandidates, normalizedTestFile);
      if (matched) {
        return {
          matched: true,
          matchedBy: "tc",
          suite: matched,
        };
      }
    }

    const caseNameCandidates = byCaseName.get(normalizedTitle) ?? [];
    const fallback = pickBestCandidate(caseNameCandidates, normalizedTestFile);
    if (!fallback) {
      return null;
    }

    return {
      matched: true,
      matchedBy: "caseName",
      suite: fallback,
    };
  };
}
