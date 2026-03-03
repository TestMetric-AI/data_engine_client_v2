import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredTestResults } from "@/lib/services/test-results-retention";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await cleanupExpiredTestResults({ force: true });

    return NextResponse.json(
      {
        message: "Cleanup completed",
        deletedCount: deleted,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Cron cleanup-tests failed", error);
    return NextResponse.json(
      { message: "Cleanup failed", error: String(error) },
      { status: 500 },
    );
  }
}
