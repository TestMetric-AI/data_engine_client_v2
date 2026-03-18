type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 120;
const DEFAULT_MAX_DELAY_MS = 1000;

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Connection timed out
  "P1017", // Server closed the connection
  "P2024", // Timeout fetching a connection from pool
]);

const TRANSIENT_MESSAGE_PATTERNS = [
  "failed to connect to upstream database",
  "failted to connect to upstream database", // typo seen in logs
  "can't reach database server",
  "timed out fetching a new connection",
  "connection terminated unexpectedly",
  "server has closed the connection",
  "connection reset",
  "read econreset",
  "socket hang up",
];

type ErrorWithCode = {
  code?: unknown;
  message?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getRetryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return Math.min(exponential + jitter, maxDelayMs);
}

export function isTransientPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, message } = error as ErrorWithCode;
  if (typeof code === "string" && TRANSIENT_PRISMA_CODES.has(code)) {
    return true;
  }

  if (typeof message !== "string") {
    return false;
  }

  const normalizedMessage = message.toLowerCase();
  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
}

export async function withPrismaReadRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = clamp(options.maxRetries ?? DEFAULT_MAX_RETRIES, 0, 10);
  const baseDelayMs = clamp(options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS, 10, 10_000);
  const maxDelayMs = clamp(
    options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    baseDelayMs,
    30_000
  );

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < maxRetries && isTransientPrismaConnectionError(error);
      if (!shouldRetry) {
        throw error;
      }

      const delayMs = getRetryDelayMs(attempt, baseDelayMs, maxDelayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
