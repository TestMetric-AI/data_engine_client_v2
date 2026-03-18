import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { withPrismaReadRetry } from "./prisma-resilience";

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveDatabaseUrl(): string {
  const primaryUrl = process.env.DATABASE_URL;
  if (!primaryUrl) {
    throw new Error("DATABASE_URL environment variable is required. Cannot start without it.");
  }

  const useFallback = process.env.DATABASE_USE_FALLBACK === "true";
  const fallbackUrl = process.env.DATABASE_URL_FALLBACK;

  if (useFallback) {
    if (!fallbackUrl) {
      console.warn(
        "[Prisma] DATABASE_USE_FALLBACK=true but DATABASE_URL_FALLBACK is missing. Using DATABASE_URL."
      );
      return primaryUrl;
    }

    console.warn("[Prisma] DATABASE_URL_FALLBACK is enabled.");
    return fallbackUrl;
  }

  return primaryUrl;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: resolveDatabaseUrl(),
    pool: {
      max: parsePositiveInt(process.env.DATABASE_POOL_MAX, 10),
      idleTimeoutMillis: parsePositiveInt(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS, 30_000),
      connectionTimeoutMillis: parsePositiveInt(
        process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
        10_000
      ),
    },
  });

  const client = new PrismaClient({ adapter });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, query, args }) {
          if (READ_OPERATIONS.has(operation)) {
            return withPrismaReadRetry(() => query(args));
          }
          return query(args);
        },
      },
    },
  });
}

type PrismaClientWithReadRetry = ReturnType<typeof createPrismaClient>;
const globalForPrisma = global as unknown as { prisma: PrismaClientWithReadRetry | undefined };

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
