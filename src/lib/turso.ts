import { createClient, Client } from "@libsql/client";

const globalForTurso = global as unknown as { turso: Client };

export const turso =
    globalForTurso.turso ||
    createClient({
        url: process.env.TURSO_DATABASE_URL || "",
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

if (process.env.NODE_ENV !== "production") globalForTurso.turso = turso;

export function createTursoConnection() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL || "",
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
}
