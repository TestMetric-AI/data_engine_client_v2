jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import type { NextRequest } from "next/server";
import { DELETE, PUT } from "../route";
import { verifyApiAuth } from "@/lib/auth-helper";
import { deleteTestSuiteById, updateTestSuiteById } from "@/lib/services/test-suites";

jest.mock("@/lib/auth-helper", () => ({
  verifyApiAuth: jest.fn(),
}));

jest.mock("@/lib/services/test-suites", () => ({
  updateTestSuiteById: jest.fn(),
  deleteTestSuiteById: jest.fn(),
}));

function mockJsonRequest(body: unknown): NextRequest {
  return {
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
  } as unknown as NextRequest;
}

function mockDeleteRequest(): NextRequest {
  return {
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe("/api/test-suites/[id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 on PUT when unauthorized", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(false);

    const res = await PUT(mockJsonRequest({ testCaseName: "updated" }), {
      params: Promise.resolve({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 on PUT when id is invalid", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);

    const res = await PUT(mockJsonRequest({ testCaseName: "updated" }), {
      params: Promise.resolve({ id: "not-uuid" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on PUT with empty payload", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);

    const res = await PUT(mockJsonRequest({}), {
      params: Promise.resolve({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 on PUT success", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);
    (updateTestSuiteById as jest.Mock).mockResolvedValue({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" });

    const id = "f7f137f3-6698-4dc6-9f89-80f6a1a6f124";
    const res = await PUT(mockJsonRequest({ testCaseName: "updated" }), {
      params: Promise.resolve({ id }),
    });

    expect(updateTestSuiteById).toHaveBeenCalledWith(id, { testCaseName: "updated" });
    expect(res.status).toBe(200);
  });

  it("returns 404 on PUT when record does not exist", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);
    const err = Object.assign(new Error("TestSuite not found."), { name: "TestSuiteNotFoundError" });
    (updateTestSuiteById as jest.Mock).mockRejectedValue(err);

    const res = await PUT(mockJsonRequest({ testCaseName: "updated" }), {
      params: Promise.resolve({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 on DELETE when unauthorized", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(false);

    const res = await DELETE(mockDeleteRequest(), {
      params: Promise.resolve({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 on DELETE when record does not exist", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);
    const err = Object.assign(new Error("TestSuite not found."), { name: "TestSuiteNotFoundError" });
    (deleteTestSuiteById as jest.Mock).mockRejectedValue(err);

    const res = await DELETE(mockDeleteRequest(), {
      params: Promise.resolve({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 200 on DELETE success", async () => {
    (verifyApiAuth as jest.Mock).mockResolvedValue(true);
    (deleteTestSuiteById as jest.Mock).mockResolvedValue({ id: "f7f137f3-6698-4dc6-9f89-80f6a1a6f124" });

    const id = "f7f137f3-6698-4dc6-9f89-80f6a1a6f124";
    const res = await DELETE(mockDeleteRequest(), { params: Promise.resolve({ id }) });
    const body = await res.json();

    expect(deleteTestSuiteById).toHaveBeenCalledWith(id);
    expect(res.status).toBe(200);
    expect(body.message).toBe("TestSuite deleted");
  });
});
