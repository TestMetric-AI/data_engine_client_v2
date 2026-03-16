import {
  createTestSuiteMatcher,
  extractTestCaseCode,
  normalizeMatchText,
  type TestSuiteCandidate,
} from "../test-result-suite-matcher";

describe("test-result-suite-matcher", () => {
  it("extracts TC code in tolerant formats", () => {
    expect(extractTestCaseCode("TC-123 sample")).toBe("123");
    expect(extractTestCaseCode("tc123 sample")).toBe("123");
    expect(extractTestCaseCode("TC - 123 sample")).toBe("123");
    expect(extractTestCaseCode("123")).toBe("123");
    expect(extractTestCaseCode("without code")).toBeNull();
  });

  it("normalizes case and accents", () => {
    expect(normalizeMatchText("  Depósito   Ágil ")).toBe("deposito agil");
  });

  it("matches by TC code from testId", () => {
    const suites: TestSuiteCandidate[] = [
      {
        id: "2",
        testSuiteId: "suite-2",
        specFile: "tests/a.spec.ts",
        testId: "TC-445",
        testCaseName: "Login flow",
      },
    ];

    const match = createTestSuiteMatcher(suites)({
      testTitle: "auth > TC445 - Login flow",
      testFile: "tests/a.spec.ts",
    });

    expect(match).not.toBeNull();
    expect(match?.matchedBy).toBe("tc");
    expect(match?.suite.testSuiteId).toBe("suite-2");
  });

  it("falls back to normalized case name equality", () => {
    const suites: TestSuiteCandidate[] = [
      {
        id: "1",
        testSuiteId: "suite-1",
        specFile: "tests/case.spec.ts",
        testId: "B-1",
        testCaseName: "Depósito a Plazo Hasta 12M PAG DOP",
      },
    ];

    const match = createTestSuiteMatcher(suites)({
      testTitle: "deposito a plazo hasta 12m pag dop",
      testFile: "tests/case.spec.ts",
    });

    expect(match).not.toBeNull();
    expect(match?.matchedBy).toBe("caseName");
    expect(match?.suite.testSuiteId).toBe("suite-1");
  });

  it("returns null when there is no match", () => {
    const suites: TestSuiteCandidate[] = [
      {
        id: "1",
        testSuiteId: "suite-1",
        specFile: "tests/case.spec.ts",
        testId: "TC-999",
        testCaseName: "Other case",
      },
    ];

    const match = createTestSuiteMatcher(suites)({
      testTitle: "TC-123 - Not present",
      testFile: "tests/case.spec.ts",
    });

    expect(match).toBeNull();
  });

  it("breaks ties by specFile and then by id", () => {
    const suites: TestSuiteCandidate[] = [
      {
        id: "b-id",
        testSuiteId: "suite-b",
        specFile: "tests/other.spec.ts",
        testId: "TC-777",
        testCaseName: "Duplicate",
      },
      {
        id: "a-id",
        testSuiteId: "suite-a",
        specFile: "tests/target.spec.ts",
        testId: "TC-777",
        testCaseName: "Duplicate",
      },
      {
        id: "c-id",
        testSuiteId: "suite-c",
        specFile: "tests/target.spec.ts",
        testId: "TC-777",
        testCaseName: "Duplicate",
      },
    ];

    const match = createTestSuiteMatcher(suites)({
      testTitle: "TC777 - Duplicate",
      testFile: "tests/target.spec.ts",
    });

    expect(match).not.toBeNull();
    expect(match?.suite.testSuiteId).toBe("suite-a");
  });
});
