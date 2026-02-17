import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required. Cannot start without it.");
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    pool: {
        max: parseInt(process.env.DATABASE_POOL_MAX || "10"),       // Max connections in pool
        idleTimeoutMillis: 30_000,                                   // Close idle connections after 30s
        connectionTimeoutMillis: 5_000,                              // Fail if connection takes >5s
    },
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
