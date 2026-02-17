/**
 * Deposits DP10 — CSV Parsing, Validation & Normalization
 */
import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
    DEPOSITS_DP10_COLUMNS,
    DECIMAL_FIELDS,
    RATE_FIELDS,
    DATE_8_FIELDS,
    DATE_10_FIELDS,
    ENUM_FIELDS,
    DECIMAL_REGEX,
    DATE_8_REGEX,
    DATE_10_REGEX,
    EXTRA_COLUMN_TYPES,
} from "./constants";
import type {
    DepositsValidationError,
    DepositsRow,
    DepositsParseResult,
    ReductionStats,
} from "./types";

// ── Normalization helpers ──────────────────────────────────────────

function normalizeDate8(value: string): string {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function normalizeDate10(value: string): string {
    const year = `20${value.slice(0, 2)}`;
    const month = value.slice(2, 4);
    const day = value.slice(4, 6);
    return `${year}-${month}-${day}`;
}

const EMPTY_TO_NULL = (value: unknown) => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== "string") {
        return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
};

export function normalizeValue(
    column: string,
    rawValue: string | number | null
): string | number | null {
    if (rawValue === null) {
        return null;
    }

    if (typeof rawValue === "number") {
        return rawValue;
    }

    const value = rawValue.trim();
    if (value.length === 0) {
        return null;
    }

    if (DECIMAL_FIELDS.has(column) || RATE_FIELDS.has(column)) {
        return Number(value);
    }

    return value;
}

export function getColumnType(column: string): string {
    const extraType = EXTRA_COLUMN_TYPES[column];
    if (extraType) {
        return extraType;
    }

    if (RATE_FIELDS.has(column) || DECIMAL_FIELDS.has(column)) {
        return "numeric"; // SQLite affinity
    }

    return "text";
}

// ── Zod schema ─────────────────────────────────────────────────────

const depositsRowSchema: z.ZodType<DepositsRow> = z.object(
    Object.fromEntries(
        DEPOSITS_DP10_COLUMNS.map((column) => {
            if (DECIMAL_FIELDS.has(column) || RATE_FIELDS.has(column)) {
                return [
                    column,
                    z.preprocess(
                        (value) => {
                            if (value === undefined || value === null) {
                                return null;
                            }
                            if (typeof value !== "string") {
                                return value;
                            }
                            const trimmed = value.trim();
                            if (trimmed.length === 0) {
                                return null;
                            }
                            if (DECIMAL_REGEX.test(trimmed)) {
                                return Number(trimmed);
                            }
                            return value;
                        },
                        z.number({ message: "Debe ser un numero decimal." }).nullable()
                    ),
                ];
            }

            if (DATE_8_FIELDS.has(column)) {
                return [
                    column,
                    z.preprocess(
                        EMPTY_TO_NULL,
                        z
                            .string()
                            .regex(DATE_8_REGEX, "Debe ser una fecha con formato YYYYMMDD.")
                            .transform(normalizeDate8)
                            .nullable()
                    ),
                ];
            }

            if (DATE_10_FIELDS.has(column)) {
                return [
                    column,
                    z.preprocess(
                        EMPTY_TO_NULL,
                        z
                            .string()
                            .regex(
                                DATE_10_REGEX,
                                "Debe ser una fecha con formato YYMMDDHHMM."
                            )
                            .transform(normalizeDate10)
                            .nullable()
                    ),
                ];
            }

            const enumValues = ENUM_FIELDS[column];
            if (enumValues) {
                return [
                    column,
                    z.preprocess(
                        (value) => {
                            if (value === undefined || value === null) {
                                return null;
                            }
                            if (typeof value !== "string") {
                                return value;
                            }
                            const trimmed = value.trim();
                            if (trimmed.length === 0) {
                                return null;
                            }
                            return trimmed.toUpperCase();
                        },
                        z.union([
                            z.enum(enumValues as [string, ...string[]], {
                                message: `Debe ser uno de: ${enumValues.join(", ")}.`,
                            }),
                            z.null(),
                        ])
                    ),
                ];
            }

            return [column, z.preprocess(EMPTY_TO_NULL, z.string().nullable())];
        })
    )
) as z.ZodType<DepositsRow>;

// ── Validation ─────────────────────────────────────────────────────

function validateHeaders(headers: string[]): DepositsValidationError | null {
    if (headers.length !== DEPOSITS_DP10_COLUMNS.length) {
        return {
            row: 1,
            column: "HEADER",
            value: headers.join("|"),
            message: "Cantidad de columnas invalida para deposits_dp10.",
        };
    }

    for (let i = 0; i < DEPOSITS_DP10_COLUMNS.length; i += 1) {
        if (headers[i] !== DEPOSITS_DP10_COLUMNS[i]) {
            return {
                row: 1,
                column: "HEADER",
                value: headers.join("|"),
                message:
                    "El orden o los nombres de columnas no coinciden con deposits_dp10.",
            };
        }
    }

    return null;
}

function validateRow(
    row: Record<string, string>,
    rowNumber: number
): DepositsValidationError[] {
    const errors: DepositsValidationError[] = [];

    for (const column of DEPOSITS_DP10_COLUMNS) {
        const rawValue = row[column] ?? "";
        const value = rawValue.trim();

        if (value.length === 0) {
            continue;
        }

        if (DECIMAL_FIELDS.has(column) || RATE_FIELDS.has(column)) {
            if (!DECIMAL_REGEX.test(value)) {
                errors.push({
                    row: rowNumber,
                    column,
                    value,
                    message: "Debe ser un numero decimal.",
                });
            }
            continue;
        }

        if (DATE_8_FIELDS.has(column)) {
            if (!DATE_8_REGEX.test(value)) {
                errors.push({
                    row: rowNumber,
                    column,
                    value,
                    message: "Debe ser una fecha con formato YYYYMMDD.",
                });
            }
            continue;
        }

        if (DATE_10_FIELDS.has(column)) {
            if (!DATE_10_REGEX.test(value)) {
                errors.push({
                    row: rowNumber,
                    column,
                    value,
                    message: "Debe ser una fecha con formato YYMMDDHHMM.",
                });
            }
            continue;
        }

        const enumValues = ENUM_FIELDS[column];
        if (enumValues && !enumValues.includes(value)) {
            errors.push({
                row: rowNumber,
                column,
                value,
                message: `Debe ser uno de: ${enumValues.join(", ")}.`,
            });
        }
    }

    return errors;
}

// ── CSV Parsing ────────────────────────────────────────────────────

export function parseDepositsCsv(buffer: Buffer): DepositsParseResult {
    let headers: string[] = [];

    const records = parse(buffer, {
        columns: (header: string[]) => {
            headers = header;
            return header;
        },
        delimiter: "|",
        skip_empty_lines: true,
        bom: true,
        trim: true,
        relax_column_count: true,
        quote: null,
    }) as Record<string, string>[];

    const errors: DepositsValidationError[] = [];
    const headerError = validateHeaders(headers);
    if (headerError) {
        errors.push(headerError);
        return { rows: [], errors };
    }

    const normalizedRows: DepositsRow[] = [];

    records.forEach((row, index) => {
        const rowNumber = index + 2;
        const rowErrors = validateRow(row, rowNumber);
        errors.push(...rowErrors);
        if (rowErrors.length > 0) {
            return;
        }

        const normalized = depositsRowSchema.safeParse(row);
        if (!normalized.success) {
            normalized.error.issues.forEach((issue) => {
                const column = issue.path[0]?.toString() ?? "ROW";
                errors.push({
                    row: rowNumber,
                    column,
                    value: row[column] ?? "",
                    message: issue.message,
                });
            });
            return;
        }

        normalizedRows.push(normalized.data);
    });

    return { rows: normalizedRows, errors };
}

// ── Data reduction ─────────────────────────────────────────────────

/**
 * Randomly sample n items from an array
 * Uses Fisher-Yates shuffle algorithm
 */
function randomSample<T>(array: T[], n: number): T[] {
    const result = [...array];
    const sampleSize = Math.min(n, array.length);

    for (let i = 0; i < sampleSize; i++) {
        const j = i + Math.floor(Math.random() * (result.length - i));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result.slice(0, sampleSize);
}

/**
 * Reduce dataset by category to manage large files
 * Ensures all ID_PRODUCTO categories are represented
 * Focuses reduction on categories with too many records
 * @param rows Array of deposit rows
 * @param maxPerCategory Maximum rows per category (default: 1000)
 * @returns Reduced rows and statistics
 */
export function reduceDataByCategory(
    rows: DepositsRow[],
    maxPerCategory: number = 1000
): { reducedRows: DepositsRow[]; stats: ReductionStats } {
    const originalCount = rows.length;

    // Group rows by ID_PRODUCTO
    const categoriesMap = new Map<string, DepositsRow[]>();

    rows.forEach(row => {
        const category = String(row.ID_PRODUCTO ?? 'UNKNOWN');
        if (!categoriesMap.has(category)) {
            categoriesMap.set(category, []);
        }
        categoriesMap.get(category)!.push(row);
    });

    const categoriesReduced: string[] = [];
    const reducedRows: DepositsRow[] = [];

    // Process each category
    categoriesMap.forEach((categoryRows, category) => {
        if (categoryRows.length <= maxPerCategory) {
            // Keep all rows for small categories
            reducedRows.push(...categoryRows);
        } else {
            // Randomly sample for large categories
            const sampled = randomSample(categoryRows, maxPerCategory);
            reducedRows.push(...sampled);
            categoriesReduced.push(category);
        }
    });

    const reducedCount = reducedRows.length;
    const reductionPercentage = originalCount > 0
        ? Math.round(((originalCount - reducedCount) / originalCount) * 10000) / 100
        : 0;

    const stats: ReductionStats = {
        originalCount,
        reducedCount,
        categoriesTotal: categoriesMap.size,
        categoriesReduced,
        reductionPercentage
    };

    // Log reduction details
    if (categoriesReduced.length > 0) {
        console.log(
            `[DEPOSITS] Data reduced: ${originalCount} → ${reducedCount} rows (${reductionPercentage}% reduction)\n` +
            `Categories total: ${categoriesMap.size}, Categories reduced: ${categoriesReduced.length}\n` +
            `Reduced categories: ${categoriesReduced.join(', ')}`
        );
    }

    return { reducedRows, stats };
}

// ── Batch sizing ───────────────────────────────────────────────────

/**
 * Calculate safe batch size for SQLite inserts
 * SQLite has a limit of 32,766 variables per statement
 * @param columnCount Number of columns in the table
 * @param preferredBatchSize Preferred batch size (default: 500)
 * @returns Object with batchSize and wasReduced flag
 */
export function calculateSafeBatchSize(
    columnCount: number,
    preferredBatchSize: number = 500
): { batchSize: number; wasReduced: boolean } {
    const SQLITE_MAX_VARIABLES = 32766;
    const maxPossibleBatchSize = Math.floor(SQLITE_MAX_VARIABLES / columnCount);

    // Add 10% safety margin
    const safeBatchSize = Math.floor(maxPossibleBatchSize * 0.9);

    if (preferredBatchSize > safeBatchSize) {
        return {
            batchSize: safeBatchSize,
            wasReduced: true
        };
    }

    return {
        batchSize: preferredBatchSize,
        wasReduced: false
    };
}
