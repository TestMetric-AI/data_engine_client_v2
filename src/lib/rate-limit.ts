import { NextRequest } from "next/server";

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function getTokenKey(req: NextRequest): string {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return `token:${auth.slice(7, 23)}`;
  }
  return `ip:${getClientIp(req)}`;
}

export function checkRateLimit(
  req: NextRequest,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const key = getTokenKey(req);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

