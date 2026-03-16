jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import type { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { verifyApiAuth } from "@/lib/auth-helper";
import { createTestSuites, listTestSuites } from "@/lib/services/test-suites";
import { requireApi } from "@/lib/rbac";

jest.mock("@/lib/auth-helper", () => ({
  verifyApiAuth: jest.fn(),
}));

jest.mock("@/lib/services/test-suites", () => ({
  listTestSuites: jest.fn(),
  createTestSuites: jest.fn(),
}));

jest.mock("@/lib/rbac", () => ({
  Permission: {
    TEST_SUITES_MANAGE: "MANAGE_TEST_SUITES",
  },
  requireApi: jest.fn(),
}));

function mockGetRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
    headers: new Headers(),
  } as unknown as NextRequest;
}

function mockJsonRequest(body: unknown): NextRequest {
  return {
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
  } as unknown as NextRequest;
}

describe("/api/test-suites route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 on GET when unauthorized", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(false);

    const res = await GET(mockGetRequest("http://localhost/api/test-suites"));

    expect(res.status).toBe(401);
  });

  it("returns 400 on GET with invalid query", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);

    const res = await GET(mockGetRequest("http://localhost/api/test-suites?page=0"));

    expect(res.status).toBe(400);
  });

  it("returns paginated data on GET", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);
    (listTestSuites as jest.Mock).mockResolvedValue({
      data: [{ id: "1" }],
      total: 1,
      totalPages: 1,
      page: 1,
      pageSize: 50,
    });

    const res = await GET(mockGetRequest("http://localhost/api/test-suites?page=1&pageSize=50&testSuiteId=suite"));
    const body = await res.json();

    expect(listTestSuites).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      testSuiteId: "suite",
      specFile: undefined,
      testId: undefined,
    });
    expect(res.status).toBe(200);
    expect(body.pagination.total).toBe(1);
  });

  it("returns 401 on POST when unauthorized", async () => {
    (requireApi as jest.Mock).mockResolvedValue({
      error: { status: 401, json: async () => ({ message: "Unauthorized" }) },
    });

    const res = await POST(mockJsonRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 403 on POST when missing permission", async () => {
    (requireApi as jest.Mock).mockResolvedValue({
      error: { status: 403, json: async () => ({ message: "Forbidden" }) },
    });

    const res = await POST(mockJsonRequest({}));
    expect(res.status).toBe(403);
  });

  it("returns 400 on POST with invalid payload", async () => {
    (requireApi as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(mockJsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 201 on POST and supports batch without SuiteID", async () => {
    (requireApi as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (createTestSuites as jest.Mock).mockResolvedValue({ count: 2, skipped: 1 });

    const res = await POST(
      mockJsonRequest([
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
      ])
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.count).toBe(2);
    expect(body.skipped).toBe(1);
  });
});
