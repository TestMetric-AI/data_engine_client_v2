import {
  isTransientPrismaConnectionError,
  withPrismaReadRetry,
} from "@/lib/prisma-resilience";

describe("prisma-resilience", () => {
  it("detects transient errors by prisma code", () => {
    const error = {
      code: "P1001",
      message: "Can't reach database server",
    };

    expect(isTransientPrismaConnectionError(error)).toBe(true);
  });

  it("detects transient errors by message", () => {
    const error = new Error("Failted to connect to upstream database");
    expect(isTransientPrismaConnectionError(error)).toBe(true);
  });

  it("returns false for non-transient errors", () => {
    const error = new Error("Unique constraint failed on the fields");
    expect(isTransientPrismaConnectionError(error)).toBe(false);
  });

  it("retries transient failures and succeeds on next attempt", async () => {
    let attempts = 0;
    const operation = jest.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        const transientError = new Error("Failed to connect to upstream database");
        (transientError as Error & { code: string }).code = "P1001";
        throw transientError;
      }
      return "ok";
    });

    const result = await withPrismaReadRetry(operation, {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 30,
    });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient failures", async () => {
    const operation = jest.fn(async () => {
      throw new Error("Invalid input");
    });

    await expect(
      withPrismaReadRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 30,
      })
    ).rejects.toThrow("Invalid input");

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("respects maxRetries for transient failures", async () => {
    const operation = jest.fn(async () => {
      const transientError = new Error("Failed to connect to upstream database");
      (transientError as Error & { code: string }).code = "P1001";
      throw transientError;
    });

    await expect(
      withPrismaReadRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 30,
      })
    ).rejects.toThrow("Failed to connect to upstream database");

    expect(operation).toHaveBeenCalledTimes(3);
  });
});
