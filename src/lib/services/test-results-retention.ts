import prisma from "@/lib/db";

const DEFAULT_RETENTION_DAYS = 15;
const DEFAULT_CLEANUP_COOLDOWN_MINUTES = 60;

let lastCleanupAtMs = 0;
let inFlightCleanup: Promise<number> | null = null;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRetentionDays(): number {
  return parsePositiveInt(process.env.TEST_RESULTS_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
}

function getCleanupCooldownMinutes(): number {
  return parsePositiveInt(
    process.env.TEST_RESULTS_CLEANUP_COOLDOWN_MINUTES,
    DEFAULT_CLEANUP_COOLDOWN_MINUTES
  );
}

export async function cleanupExpiredTestResults(options?: { force?: boolean }): Promise<number> {
  const force = options?.force ?? false;
  const now = Date.now();
  const cooldownMs = getCleanupCooldownMinutes() * 60 * 1000;

  if (!force && lastCleanupAtMs > 0 && now - lastCleanupAtMs < cooldownMs) {
    return 0;
  }

  if (inFlightCleanup) {
    return inFlightCleanup;
  }

  inFlightCleanup = (async () => {
    try {
      const retentionDays = getRetentionDays();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const { count } = await prisma.testResult.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      lastCleanupAtMs = Date.now();
      return count;
    } catch (error) {
      console.error("Failed to cleanup expired test results", error);
      return 0;
    } finally {
      inFlightCleanup = null;
    }
  })();

  return inFlightCleanup;
}

