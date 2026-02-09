import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";

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
                args: batchValues as any[],
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
    await ensureDepositsInterestChangeTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // Build WHERE clause if filters are provided
    if (filters) {
        const exactFilters: Array<keyof DepositsInterestChangePaginationFilters> = [
            "NUM_CERTIFICADO",
            "USUARIO_CAMBIO_TASA",
            "INTEREST_TYPE",
        ];

        for (const key of exactFilters) {
            const value = filters[key];
            if (value) {
                conditions.push(`"${key}" = ?`);
                args.push(value);
            }
        }

        if (filters.FECHA_CAMBIO_TASA_DESDE && filters.FECHA_CAMBIO_TASA_HASTA) {
            conditions.push(`"FECHA_CAMBIO_TASA" BETWEEN ? AND ?`);
            args.push(filters.FECHA_CAMBIO_TASA_DESDE);
            args.push(filters.FECHA_CAMBIO_TASA_HASTA);
        }
    }

    const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as total FROM ${DEPOSITS_INTEREST_CHANGE_TABLE}${whereClause};`,
        args: args,
    });
    const total = Number(countResult.rows[0][0] ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSITS_INTEREST_CHANGE_TABLE}${whereClause}
          ORDER BY FECHA_CAMBIO_TASA DESC, NUM_CERTIFICADO ASC
          LIMIT ? OFFSET ?;`,
        args: [...args, limit, offset],
    });

    const rows = dataResult.rows.map((row) => {
        const record: Record<string, unknown> = {};
        dataResult.columns.forEach((col, idx) => {
            record[col] = row[idx];
        });
        return record;
    });

    return { rows, total };
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
    await ensureDepositsInterestChangeTable();

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

export async function findInterestChangeByFilters(
    filters: DepositsInterestChangeQueryFilters
): Promise<Record<string, unknown> | null> {
    await ensureDepositsInterestChangeTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // Exact match filters
    const exactFilters: Array<keyof DepositsInterestChangeQueryFilters> = [
        "NUM_CERTIFICADO",
        "INTEREST_TYPE",
    ];

    for (const key of exactFilters) {
        const value = filters[key];
        if (value) {
            conditions.push(`"${key}" = ?`);
            args.push(value);
        }
    }

    // Date range filter
    if (filters.FECHA_CAMBIO_TASA_DESDE && filters.FECHA_CAMBIO_TASA_HASTA) {
        conditions.push(`"FECHA_CAMBIO_TASA" BETWEEN ? AND ?`);
        args.push(filters.FECHA_CAMBIO_TASA_DESDE);
        args.push(filters.FECHA_CAMBIO_TASA_HASTA);
    }

    const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const sql = `SELECT * FROM ${DEPOSITS_INTEREST_CHANGE_TABLE}${whereClause} LIMIT 1;`;

    const result = await turso.execute({ sql, args });

    if (result.rows.length === 0) return null;

    // Convert row to record
    const row = result.rows[0];
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
        record[col] = row[idx];
    });

    return record;
}

