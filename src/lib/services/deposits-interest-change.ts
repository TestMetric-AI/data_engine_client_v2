import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";
import type { InValue } from "@libsql/client";
import {
    createWhereClause,
    addExactFilters,
    addDateRange,
    toWhereSQL,
    rowToRecord,
    rowsToRecords,
} from "./query-builder";

export const DEPOSITS_INTEREST_CHANGE_TABLE = "deposits_interest_change";

// CSV columns - these are the columns expected in the uploaded CSV file
export const DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS = [
    "NUM_CERTIFICADO",
    "TASA_INTERES_ANTERIOR",
    "TASA_POOL_ANTERIOR",
    "TASA_INTERES_NUEVA",
    "TASA_POOL_NUEVA",
    "FECHA_CAMBIO_TASA",
    "USUARIO_CAMBIO_TASA",
];

// Database columns - includes additional columns not in CSV
export const DEPOSITS_INTEREST_CHANGE_TABLE_COLUMNS = [
    ...DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS,
    "INTEREST_TYPE",
];

const DECIMAL_FIELDS = new Set([
    "TASA_INTERES_ANTERIOR",
    "TASA_POOL_ANTERIOR",
    "TASA_INTERES_NUEVA",
    "TASA_POOL_NUEVA",
]);

const DATE_8_FIELDS = new Set(["FECHA_CAMBIO_TASA"]);

const DECIMAL_REGEX = /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
const DATE_8_REGEX = /^\d{8}$/;

function normalizeDate8(value: string): string {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export type DepositsInterestChangeValidationError = {
    row: number;
    column: string;
    value: string;
    message: string;
};

export type DepositsInterestChangeRow = Record<string, string | number | null>;

export type DepositsInterestChangeParseResult = {
    rows: DepositsInterestChangeRow[];
    errors: DepositsInterestChangeValidationError[];
};

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

const depositsInterestChangeRowSchema: z.ZodType<DepositsInterestChangeRow> = z.object(
    Object.fromEntries(
        DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.map((column) => {
            if (DECIMAL_FIELDS.has(column)) {
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

            return [column, z.preprocess(EMPTY_TO_NULL, z.string().nullable())];
        })
    )
) as z.ZodType<DepositsInterestChangeRow>;

export function parseDepositsInterestChangeCsv(buffer: Buffer): DepositsInterestChangeParseResult {
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

    const errors: DepositsInterestChangeValidationError[] = [];
    const headerError = validateHeaders(headers);
    if (headerError) {
        errors.push(headerError);
        return { rows: [], errors };
    }

    const normalizedRows: DepositsInterestChangeRow[] = [];

    records.forEach((row, index) => {
        const rowNumber = index + 2;
        const rowErrors = validateRow(row, rowNumber);
        errors.push(...rowErrors);
        if (rowErrors.length > 0) {
            return;
        }

        const normalized = depositsInterestChangeRowSchema.safeParse(row);
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

function validateHeaders(headers: string[]): DepositsInterestChangeValidationError | null {
    if (headers.length !== DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.length) {
        return {
            row: 1,
            column: "HEADER",
            value: headers.join("|"),
            message: "Cantidad de columnas invalida para deposits_interest_change.",
        };
    }

    for (let i = 0; i < DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.length; i += 1) {
        if (headers[i] !== DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS[i]) {
            return {
                row: 1,
                column: "HEADER",
                value: headers.join("|"),
                message:
                    "El orden o los nombres de columnas no coinciden con deposits_interest_change.",
            };
        }
    }

    return null;
}

function validateRow(
    row: Record<string, string>,
    rowNumber: number
): DepositsInterestChangeValidationError[] {
    const errors: DepositsInterestChangeValidationError[] = [];

    for (const column of DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS) {
        const rawValue = row[column] ?? "";
        const value = rawValue.trim();

        if (value.length === 0) {
            continue;
        }

        if (DECIMAL_FIELDS.has(column)) {
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
    }

    return errors;
}

async function ensureExtraColumns(): Promise<void> {
    // Get existing columns from the table
    const infoResult = await turso.execute(`PRAGMA table_info(${DEPOSITS_INTEREST_CHANGE_TABLE});`);
    const existing = new Set<string>();

    infoResult.rows.forEach(row => {
        const nameIdx = infoResult.columns.indexOf("name");
        if (typeof row[nameIdx] === 'string') {
            existing.add(row[nameIdx] as string);
        }
    });

    // Add INTEREST_TYPE column if it doesn't exist
    if (!existing.has("INTEREST_TYPE")) {
        try {
            await turso.execute(
                `ALTER TABLE ${DEPOSITS_INTEREST_CHANGE_TABLE} ADD COLUMN "INTEREST_TYPE" TEXT;`
            );
        } catch (e) {
            // Ignore if column exists (race condition)
        }
    }
}

/**
 * Calculate safe batch size for SQLite inserts
 * SQLite has a limit of 32,766 variables per statement
 * @param columnCount Number of columns in the table
 * @param preferredBatchSize Preferred batch size (default: 500)
 * @returns Object with batchSize and wasReduced flag
 */
function calculateSafeBatchSize(
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

export async function ensureDepositsInterestChangeTable(): Promise<void> {
    const columnDefs = DEPOSITS_INTEREST_CHANGE_TABLE_COLUMNS
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${DEPOSITS_INTEREST_CHANGE_TABLE} (${columnDefs});`;
    await turso.execute(createSql);
    await ensureExtraColumns();
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_INTEREST_CHANGE_TABLE}_certificate ON ${DEPOSITS_INTEREST_CHANGE_TABLE}(NUM_CERTIFICADO);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_INTEREST_CHANGE_TABLE}_interest_type ON ${DEPOSITS_INTEREST_CHANGE_TABLE}(INTEREST_TYPE);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_INTEREST_CHANGE_TABLE}_change_date ON ${DEPOSITS_INTEREST_CHANGE_TABLE}(FECHA_CAMBIO_TASA);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_INTEREST_CHANGE_TABLE}_user_change ON ${DEPOSITS_INTEREST_CHANGE_TABLE}(USUARIO_CAMBIO_TASA);`);
}

export async function insertDepositsInterestChange(rows: DepositsInterestChangeRow[]): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureDepositsInterestChangeTable();

    const columnsSql = DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.map((col) => `"${col}"`).join(", ");

    // Calculate safe batch size based on column count
    const { batchSize: BATCH_SIZE, wasReduced } = calculateSafeBatchSize(
        DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.length,
        500 // Preferred batch size
    );

    if (wasReduced) {
        console.warn(
            `[DEPOSITS_INTEREST_CHANGE] Batch size reduced to ${BATCH_SIZE} rows to comply with SQLite's variable limit. ` +
            `(${DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.length} columns × ${BATCH_SIZE} rows = ${DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.length * BATCH_SIZE} variables, max: 32,766)`
        );
    }

    const transaction = await turso.transaction("write");

    try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            // Create multi-row INSERT statement
            const placeholderRows = batch
                .map(() => `(${DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.map(() => "?").join(", ")})`)
                .join(", ");

            const batchInsertSql = `INSERT INTO ${DEPOSITS_INTEREST_CHANGE_TABLE} (${columnsSql}) VALUES ${placeholderRows};`;

            // Flatten all values for the batch
            const batchValues = batch.flatMap((row) =>
                DEPOSITS_INTEREST_CHANGE_CSV_COLUMNS.map((column) =>
                    normalizeValue(column, row[column] ?? "")
                )
            );

            await transaction.execute({
                sql: batchInsertSql,
                args: batchValues as InValue[],
            });
        }
        await transaction.commit();
    } catch (error) {
        await transaction.close();
        throw error;
    }

    return rows.length;
}

export async function clearDepositsInterestChange(): Promise<void> {
    await ensureDepositsInterestChangeTable();
    await turso.execute(`DELETE FROM ${DEPOSITS_INTEREST_CHANGE_TABLE};`);
}

export type DepositsInterestChangePage = {
    rows: Record<string, unknown>[];
    total: number;
};

export type DepositsInterestChangePaginationFilters = {
    NUM_CERTIFICADO?: string;
    USUARIO_CAMBIO_TASA?: string;
    INTEREST_TYPE?: string;
    FECHA_CAMBIO_TASA_DESDE?: string;
    FECHA_CAMBIO_TASA_HASTA?: string;
};

export type DepositsInterestChangeQueryFilters = {
    NUM_CERTIFICADO?: string;
    INTEREST_TYPE?: string;
    FECHA_CAMBIO_TASA_DESDE?: string;
    FECHA_CAMBIO_TASA_HASTA?: string;
};

export async function listDepositsInterestChange(
    limit: number,
    offset: number,
    filters?: DepositsInterestChangePaginationFilters
): Promise<DepositsInterestChangePage> {
    const wc = createWhereClause();

    if (filters) {
        addExactFilters(wc, filters, [
            "NUM_CERTIFICADO",
            "USUARIO_CAMBIO_TASA",
            "INTEREST_TYPE",
        ]);

        addDateRange(wc, filters, "FECHA_CAMBIO_TASA_DESDE", "FECHA_CAMBIO_TASA_HASTA", "FECHA_CAMBIO_TASA");
    }

    const whereSQL = toWhereSQL(wc);

    const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as total FROM ${DEPOSITS_INTEREST_CHANGE_TABLE}${whereSQL};`,
        args: wc.args,
    });
    const total = Number(countResult.rows[0][0] ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSITS_INTEREST_CHANGE_TABLE}${whereSQL}
          ORDER BY FECHA_CAMBIO_TASA DESC, NUM_CERTIFICADO ASC
          LIMIT ? OFFSET ?;`,
        args: [...wc.args, limit, offset],
    });

    return { rows: rowsToRecords(dataResult), total };
}

function normalizeValue(
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

    if (DECIMAL_FIELDS.has(column)) {
        return Number(value);
    }

    return value;
}

function getColumnType(column: string): string {
    if (DECIMAL_FIELDS.has(column)) {
        return "numeric";
    }

    return "text";
}

export async function getAllCertificateNumbers(): Promise<string[]> {
    const result = await turso.execute({
        sql: `SELECT DISTINCT "NUM_CERTIFICADO" FROM ${DEPOSITS_INTEREST_CHANGE_TABLE} WHERE "NUM_CERTIFICADO" IS NOT NULL ORDER BY "NUM_CERTIFICADO" ASC;`,
        args: [],
    });

    return result.rows.map((row) => String(row[0]));
}

export async function updateInterestTypeByCertificate(
    numCertificado: string,
    interestType: string
): Promise<{ updated: boolean }> {
    await ensureDepositsInterestChangeTable();

    const result = await turso.execute({
        sql: `UPDATE ${DEPOSITS_INTEREST_CHANGE_TABLE} SET "INTEREST_TYPE" = ? WHERE "NUM_CERTIFICADO" = ?;`,
        args: [interestType, numCertificado],
    });

    return { updated: result.rowsAffected > 0 };
}

export type BulkUpdateInterestResult = {
    updated: number;
    notFound: Array<{ NUM_CERTIFICADO: string; reason: string }>;
    errors: Array<{ NUM_CERTIFICADO: string; error: string }>;
};

/**
 * Bulk update INTEREST_TYPE field for multiple certificates from CSV data
 * Continues updating valid records even if some fail
 * @param updates Array of {NUM_CERTIFICADO, INTEREST_TYPE} objects
 * @returns Object with counts of updated, notFound, and errors
 */
export async function bulkUpdateInterestTypeByCertificate(
    updates: Array<{ NUM_CERTIFICADO: string; INTEREST_TYPE: string }>
): Promise<BulkUpdateInterestResult> {
    await ensureDepositsInterestChangeTable();

    const result: BulkUpdateInterestResult = {
        updated: 0,
        notFound: [],
        errors: [],
    };

    // Process each update individually (no transaction - partial updates allowed)
    for (const update of updates) {
        try {
            const { NUM_CERTIFICADO, INTEREST_TYPE } = update;

            // Check if certificate exists
            const checkResult = await turso.execute({
                sql: `SELECT COUNT(*) as count FROM ${DEPOSITS_INTEREST_CHANGE_TABLE} WHERE "NUM_CERTIFICADO" = ?;`,
                args: [NUM_CERTIFICADO],
            });

            const count = Number(checkResult.rows[0]?.[0] ?? 0);

            if (count === 0) {
                result.notFound.push({
                    NUM_CERTIFICADO,
                    reason: "Certificate not found",
                });
                continue;
            }

            // Update the record
            const updateResult = await turso.execute({
                sql: `UPDATE ${DEPOSITS_INTEREST_CHANGE_TABLE} SET "INTEREST_TYPE" = ? WHERE "NUM_CERTIFICADO" = ?;`,
                args: [INTEREST_TYPE, NUM_CERTIFICADO],
            });

            if (updateResult.rowsAffected > 0) {
                result.updated += updateResult.rowsAffected;
            } else {
                result.notFound.push({
                    NUM_CERTIFICADO,
                    reason: "Update failed - no rows affected",
                });
            }
        } catch (error) {
            result.errors.push({
                NUM_CERTIFICADO: update.NUM_CERTIFICADO,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return result;
}

export async function findInterestChangeByFilters(
    filters: DepositsInterestChangeQueryFilters
): Promise<Record<string, unknown> | null> {
    const wc = createWhereClause();

    addExactFilters(wc, filters, [
        "NUM_CERTIFICADO",
        "INTEREST_TYPE",
    ]);

    addDateRange(wc, filters, "FECHA_CAMBIO_TASA_DESDE", "FECHA_CAMBIO_TASA_HASTA", "FECHA_CAMBIO_TASA");

    const sql = `SELECT * FROM ${DEPOSITS_INTEREST_CHANGE_TABLE}${toWhereSQL(wc)} LIMIT 1;`;
    const result = await turso.execute({ sql, args: wc.args });

    if (result.rows.length === 0) return null;

    return rowToRecord(result);
}

