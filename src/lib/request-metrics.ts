import { NextRequest } from "next/server";

export function logApiRequestMetrics(
  req: NextRequest,
  status: number,
  startedAt: number,
  responseBody: unknown
) {
  const durationMs = Date.now() - startedAt;
  const bytes = Buffer.byteLength(JSON.stringify(responseBody ?? {}), "utf8");
  const path = req.nextUrl.pathname;

  console.info(
    JSON.stringify({
      type: "api_cost_metric",
      path,
      method: req.method,
      status,
      durationMs,
      responseBytes: bytes,
      timestamp: new Date().toISOString(),
    })
  );
}

