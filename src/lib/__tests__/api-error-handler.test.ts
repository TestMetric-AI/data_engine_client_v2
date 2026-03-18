jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { handleApiError } from "@/lib/api-error-handler";

describe("handleApiError", () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

  afterEach(() => {
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  afterAll(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("returns 503 for transient Prisma connection errors", async () => {
    const transientError = new Error("Failed to connect to upstream database");
    (transientError as Error & { code: string }).code = "P1001";

    const response = handleApiError(transientError, "testing");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      message: "Database temporarily unavailable. Please retry shortly.",
      retryAfterSeconds: 3,
    });
  });

  it("keeps mapped Prisma known errors behavior", async () => {
    const prismaKnownError = {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      message: "Unique constraint failed",
    };

    const response = handleApiError(prismaKnownError, "testing");
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      message: "A record with this value already exists.",
    });
  });

  it("returns 500 for unknown errors", async () => {
    const response = handleApiError(new Error("Unexpected"), "testing");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      message: "Internal server error",
    });
  });
});
