import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── Error types ────────────────────────────────────────────────────

/**
 * Throw this from service code to return a specific HTTP status + message.
 * Any other error type is treated as an unexpected 500.
 */
export class ApiError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// Convenience factory functions
export const badRequest = (msg: string) => new ApiError(400, msg);
export const unauthorized = (msg = "Unauthorized") => new ApiError(401, msg);
export const notFound = (msg: string) => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);

// ── Shared error response shape ────────────────────────────────────

type ErrorResponseBody = {
    message: string;
    errors?: unknown[];
};

// ── Handler ────────────────────────────────────────────────────────

/**
 * Converts any thrown error into a well-shaped NextResponse.
 *
 * Usage:
 * ```ts
 * try { … } catch (error) {
 *   return handleApiError(error, "listing deposits");
 * }
 * ```
 *
 * @param error   The caught error (unknown)
 * @param context A short human-readable label for log context, e.g. "uploading CSV"
 */
export function handleApiError(
    error: unknown,
    context: string
): NextResponse<ErrorResponseBody> {
    // Known, intentional API errors
    if (error instanceof ApiError) {
        console.warn(`[API] ${context}: ${error.message} (${error.statusCode})`);
        return NextResponse.json(
            { message: error.message },
            { status: error.statusCode }
        );
    }

    // Zod validation errors → 400
    if (error instanceof ZodError) {
        console.warn(`[API] ${context}: Validation failed`, error.issues);
        return NextResponse.json(
            { message: "Validation error", errors: error.issues },
            { status: 400 }
        );
    }

    // Prisma known request errors → 400/409
    if (isPrismaKnownError(error)) {
        const prismaMsg = getPrismaErrorMessage(error);
        console.warn(`[API] ${context}: Prisma error ${error.code} — ${prismaMsg}`);
        const status = error.code === "P2002" ? 409 : 400;
        return NextResponse.json({ message: prismaMsg }, { status });
    }

    // Everything else → 500
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[API] ${context}:`, error);
    return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
    );
}

// ── Prisma helpers ─────────────────────────────────────────────────

interface PrismaKnownRequestError {
    name: string;
    code: string;
    meta?: Record<string, unknown>;
    message: string;
}

function isPrismaKnownError(error: unknown): error is PrismaKnownRequestError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "name" in error &&
        (error as { name: string }).name === "PrismaClientKnownRequestError"
    );
}

function getPrismaErrorMessage(error: PrismaKnownRequestError): string {
    switch (error.code) {
        case "P2002":
            return "A record with this value already exists.";
        case "P2025":
            return "Record not found.";
        case "P2003":
            return "Related record not found (foreign key constraint).";
        default:
            return `Database error (${error.code}).`;
    }
}
