import { createClient, Client } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL environment variable is required. Cannot start without it.");
}

const globalForTurso = global as unknown as { turso: Client };

export const turso =
    globalForTurso.turso ||
    createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

if (process.env.NODE_ENV !== "production") globalForTurso.turso = turso;

export function createTursoConnection() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
}
