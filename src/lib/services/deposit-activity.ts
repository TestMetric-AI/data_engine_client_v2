import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";

export const DEPOSIT_ACTIVITY_TABLE = "deposit_activity";

// CSV columns (what we expect in the uploaded file)
export const DEPOSIT_ACTIVITY_CSV_COLUMNS = [
    "NUM_CERTIFICADO",
    "REFERENCIA",
    "FECHA_REGISTRO",
    "TIPO",
    "ID",
    "DESCRIPCION",
    "ESTADO",
    "USUARIO_CREADOR",
    "USUARIO_APROBADOR",
    "FECHA_APROBACION",
    "MONTO",
];

// Database columns (includes tracking columns)
export const DEPOSIT_ACTIVITY_COLUMNS = [
    ...DEPOSIT_ACTIVITY_CSV_COLUMNS,
    "USED",
    "TIMES_USED",
    "EXISTS",
];

export type DepositActivityRow = Record<string, string | null>;

export type DepositActivityValidationError = {
    row: number;
    column: string;
    value: string;
    message: string;
};

export type DepositActivityParseResult = {
    rows: DepositActivityRow[];
    errors: DepositActivityValidationError[];
};

export type DepositActivityPage = {
    rows: Record<string, unknown>[];
    total: number;
};

const EMPTY_TO_NULL = (value: unknown): string | null => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length === 0 ? null : trimmed;
    }
    return String(value);
};

const DepositActivityRowSchema = z.object({
    NUM_CERTIFICADO: z.string().nullable().transform(EMPTY_TO_NULL),
    REFERENCIA: z.string().nullable().transform(EMPTY_TO_NULL),
    FECHA_REGISTRO: z.string().nullable().transform(EMPTY_TO_NULL),
    TIPO: z.string().nullable().transform(EMPTY_TO_NULL),
    ID: z.string().nullable().transform(EMPTY_TO_NULL),
    DESCRIPCION: z.string().nullable().transform(EMPTY_TO_NULL),
    ESTADO: z.string().nullable().transform(EMPTY_TO_NULL),
    USUARIO_CREADOR: z.string().nullable().transform(EMPTY_TO_NULL),
    USUARIO_APROBADOR: z.string().nullable().transform(EMPTY_TO_NULL),
    FECHA_APROBACION: z.string().nullable().transform(EMPTY_TO_NULL),
    MONTO: z.string().nullable().transform(EMPTY_TO_NULL),
    USED: z.string().nullable().transform(EMPTY_TO_NULL).optional(),
    TIMES_USED: z.string().nullable().transform(EMPTY_TO_NULL).optional(),
});

/**
 * Parse deposit activity CSV file
 * Handles multi-value rows separated by ]
 */
export function parseDepositActivityCsv(buffer: Buffer): DepositActivityParseResult {
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

    const errors: DepositActivityValidationError[] = [];
    const headerError = validateHeaders(headers);
    if (headerError) {
        errors.push(headerError);
        return { rows: [], errors };
    }

    const normalizedRows: DepositActivityRow[] = [];

    records.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because index is 0-based and we skip header

        // Check if row contains multi-value separator ]
        const hasMultiValue = Object.values(row).some(val => val && val.includes("]"));

        if (hasMultiValue) {
            // Split multi-value row into individual rows
            const splitRows = splitMultiValueRow(row);
            splitRows.forEach(splitRow => {
                const normalized = DepositActivityRowSchema.safeParse(splitRow);
                if (!normalized.success) {
                    normalized.error.issues.forEach((issue) => {
                        errors.push({
                            row: rowNumber,
                            column: issue.path[0]?.toString() ?? "UNKNOWN",
                            value: splitRow[issue.path[0]?.toString() ?? ""] ?? "",
                            message: issue.message,
                        });
                    });
                    return;
                }
                normalizedRows.push(normalized.data);
            });
        } else {
            // Single value row
            const normalized = DepositActivityRowSchema.safeParse(row);
            if (!normalized.success) {
                normalized.error.issues.forEach((issue) => {
                    errors.push({
                        row: rowNumber,
                        column: issue.path[0]?.toString() ?? "UNKNOWN",
                        value: row[issue.path[0]?.toString() ?? ""] ?? "",
                        message: issue.message,
                    });
                });
                return;
            }
            normalizedRows.push(normalized.data);
        }
    });

    return { rows: normalizedRows, errors };
}

/**
 * Split a multi-value row into individual rows
 */
function splitMultiValueRow(row: Record<string, string>): Record<string, string>[] {
    // Find the maximum number of values in any column
    let maxValues = 1;
    const columnValues: Record<string, string[]> = {};

    DEPOSIT_ACTIVITY_CSV_COLUMNS.forEach(col => {
        const value = row[col] || "";
        const values = value.split("]");
        columnValues[col] = values;
        maxValues = Math.max(maxValues, values.length);
    });

    // Create individual rows
    const result: Record<string, string>[] = [];
    for (let i = 0; i < maxValues; i++) {
        const newRow: Record<string, string> = {};
        DEPOSIT_ACTIVITY_CSV_COLUMNS.forEach(col => {
            // Use the i-th value if it exists, otherwise use the last value or empty string
            const values = columnValues[col];
            newRow[col] = values[i] !== undefined ? values[i] : (values[values.length - 1] || "");
        });
        result.push(newRow);
    }

    return result;
}

function validateHeaders(headers: string[]): DepositActivityValidationError | null {
    if (headers.length !== DEPOSIT_ACTIVITY_CSV_COLUMNS.length) {
        return {
            row: 1,
            column: "HEADER",
            value: headers.join("|"),
            message: "Cantidad de columnas invalida para deposit_activity.",
        };
    }

    for (let i = 0; i < headers.length; i++) {
        if (headers[i] !== DEPOSIT_ACTIVITY_CSV_COLUMNS[i]) {
            return {
                row: 1,
                column: headers[i],
                value: headers[i],
                message: `Columna esperada: ${DEPOSIT_ACTIVITY_CSV_COLUMNS[i]}, recibida: ${headers[i]}`,
            };
        }
    }

    return null;
}

/**
 * Calculate safe batch size for SQLite inserts
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

function getColumnType(column: string): string {
    if (column === "USED") {
        return "INTEGER DEFAULT 0";
    }
    if (column === "TIMES_USED") {
        return "INTEGER DEFAULT 0";
    }
    if (column === "EXISTS") {
        return "INTEGER DEFAULT 0";
    }
    return "TEXT";
}

function normalizeValue(column: string, value: string | null): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed.length === 0 ? null : trimmed;
}

export async function ensureDepositActivityTable(): Promise<void> {
    const columnDefs = DEPOSIT_ACTIVITY_COLUMNS
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${DEPOSIT_ACTIVITY_TABLE} (${columnDefs});`;
    await turso.execute(createSql);

    // Migration: Add USED and TIMES_USED columns if they don't exist
    try {
        await turso.execute(`ALTER TABLE ${DEPOSIT_ACTIVITY_TABLE} ADD COLUMN "USED" INTEGER DEFAULT 0;`);
    } catch (error) {
        // Column already exists, ignore error
    }

    try {
        await turso.execute(`ALTER TABLE ${DEPOSIT_ACTIVITY_TABLE} ADD COLUMN "TIMES_USED" INTEGER DEFAULT 0;`);
    } catch (error) {
        // Column already exists, ignore error
    }

    try {
        await turso.execute(`ALTER TABLE ${DEPOSIT_ACTIVITY_TABLE} ADD COLUMN "EXISTS" INTEGER DEFAULT 0;`);
    } catch (error) {
        // Column already exists, ignore error
    }
}

export async function insertDepositActivity(rows: DepositActivityRow[]): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureDepositActivityTable();

    const columnsSql = DEPOSIT_ACTIVITY_COLUMNS.map((col) => `"${col}"`).join(", ");

    // Calculate safe batch size based on column count
    const { batchSize: BATCH_SIZE, wasReduced } = calculateSafeBatchSize(
        DEPOSIT_ACTIVITY_COLUMNS.length,
        500 // Preferred batch size
    );

    if (wasReduced) {
        console.warn(
            `[DEPOSIT_ACTIVITY] Batch size reduced to ${BATCH_SIZE} rows to comply with SQLite's variable limit. ` +
            `(${DEPOSIT_ACTIVITY_COLUMNS.length} columns × ${BATCH_SIZE} rows = ${DEPOSIT_ACTIVITY_COLUMNS.length * BATCH_SIZE} variables, max: 32,766)`
        );
    }

    const transaction = await turso.transaction("write");

    try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            // Create multi-row INSERT statement
            const placeholderRows = batch
                .map(() => `(${DEPOSIT_ACTIVITY_COLUMNS.map(() => "?").join(", ")})`)
                .join(", ");

            const batchInsertSql = `INSERT INTO ${DEPOSIT_ACTIVITY_TABLE} (${columnsSql}) VALUES ${placeholderRows};`;

            // Flatten all values for the batch
            const batchValues = batch.flatMap((row) =>
                DEPOSIT_ACTIVITY_COLUMNS.map((column) =>
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

export async function clearDepositActivity(): Promise<void> {
    await ensureDepositActivityTable();
    await turso.execute(`DELETE FROM ${DEPOSIT_ACTIVITY_TABLE};`);
}

/**
 * Mark a deposit activity record as used by its rowid
 */
export async function markDepositActivityUsedByRowId(rowId: number): Promise<void> {
    await ensureDepositActivityTable();

    const sql = `
        UPDATE ${DEPOSIT_ACTIVITY_TABLE}
        SET "USED" = 1,
            "TIMES_USED" = COALESCE("TIMES_USED", 0) + 1
        WHERE rowid = ?;
    `;

    console.log("[DEBUG MARK USED] Marking rowid:", rowId);
    const result = await turso.execute({
        sql,
        args: [rowId],
    });
    console.log("[DEBUG MARK USED] Rows affected:", result.rowsAffected);
}

/**
 * Update EXISTS field for a deposit activity record by NUM_CERTIFICADO
 */
export async function updateDepositActivityExists(
    numCertificado: string,
    exists: boolean
): Promise<{ updated: number }> {
    await ensureDepositActivityTable();

    const sql = `
        UPDATE ${DEPOSIT_ACTIVITY_TABLE}
        SET "EXISTS" = ?
        WHERE "NUM_CERTIFICADO" = ?;
    `;

    const result = await turso.execute({
        sql,
        args: [exists ? 1 : 0, numCertificado],
    });

    return { updated: result.rowsAffected };
}

export type BulkUpdateActivityResult = {
    updated: number;
    notFound: Array<{ NUM_CERTIFICADO: string; reason: string }>;
    errors: Array<{ NUM_CERTIFICADO: string; error: string }>;
};

/**
 * Bulk update EXISTS field for multiple deposit activity records from CSV data
 * Continues updating valid records even if some fail
 * @param updates Array of {NUM_CERTIFICADO, EXISTS} objects
 * @returns Object with counts of updated, notFound, and errors
 */
export async function bulkUpdateDepositActivityExists(
    updates: Array<{ NUM_CERTIFICADO: string; EXISTS: boolean }>
): Promise<BulkUpdateActivityResult> {
    await ensureDepositActivityTable();

    const result: BulkUpdateActivityResult = {
        updated: 0,
        notFound: [],
        errors: [],
    };

    // Process each update individually (no transaction - partial updates allowed)
    for (const update of updates) {
        try {
            const { NUM_CERTIFICADO, EXISTS } = update;

            // Check if certificate exists
            const checkResult = await turso.execute({
                sql: `SELECT COUNT(*) as count FROM ${DEPOSIT_ACTIVITY_TABLE} WHERE "NUM_CERTIFICADO" = ?;`,
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
                sql: `UPDATE ${DEPOSIT_ACTIVITY_TABLE} SET "EXISTS" = ? WHERE "NUM_CERTIFICADO" = ?;`,
                args: [EXISTS ? 1 : 0, NUM_CERTIFICADO],
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

/**
 * Get all NUM_CERTIFICADO values from deposit_activity
 */
export async function getAllCertificateNumbers(): Promise<string[]> {
    await ensureDepositActivityTable();

    const sql = `
        SELECT DISTINCT "NUM_CERTIFICADO"
        FROM ${DEPOSIT_ACTIVITY_TABLE}
        WHERE "NUM_CERTIFICADO" IS NOT NULL
        ORDER BY "NUM_CERTIFICADO";
    `;

    const result = await turso.execute(sql);

    return result.rows.map(row => String(row[0])).filter(Boolean);
}

export type DepositActivityListFilters = {
    NUM_CERTIFICADO?: string;
    ESTADO?: string;
    ID?: string;
    EXISTS?: boolean;
};

export async function listDepositActivity(
    limit: number,
    offset: number,
    filters?: DepositActivityListFilters
): Promise<DepositActivityPage> {
    await ensureDepositActivityTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // Apply filters if provided
    if (filters) {
        if (filters.NUM_CERTIFICADO) {
            conditions.push(`"NUM_CERTIFICADO" = ?`);
            args.push(filters.NUM_CERTIFICADO);
        }
        if (filters.ESTADO) {
            conditions.push(`"ESTADO" = ?`);
            args.push(filters.ESTADO);
        }
        if (filters.ID) {
            conditions.push(`"ID" = ?`);
            args.push(filters.ID);
        }
        if (filters.EXISTS !== undefined) {
            conditions.push(`"EXISTS" = ?`);
            args.push(filters.EXISTS ? 1 : 0);
        }
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as count FROM ${DEPOSIT_ACTIVITY_TABLE}${whereClause};`,
        args: args,
    });
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSIT_ACTIVITY_TABLE}${whereClause} ORDER BY FECHA_REGISTRO DESC LIMIT ? OFFSET ?;`,
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

export type DepositActivityQueryFilters = {
    NUM_CERTIFICADO?: string;
    REFERENCIA?: string;
    TIPO?: string;
    ID?: string;
    ESTADO?: string;
    USUARIO_CREADOR?: string;
    USUARIO_APROBADOR?: string;
    FECHA_REGISTRO_DESDE?: string;
    FECHA_REGISTRO_HASTA?: string;
    EXISTS?: boolean;
};

/**
 * Query deposit activity by filters
 * Returns the first matching UNUSED record
 */
export async function findDepositActivityByFilters(
    filters: DepositActivityQueryFilters
): Promise<(Record<string, unknown> & { __rowid?: number | null }) | null> {
    await ensureDepositActivityTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // CRITICAL: Only return unused records
    conditions.push(`("USED" IS NULL OR "USED" = 0)`);

    const exactFilters: Array<keyof DepositActivityQueryFilters> = [
        "NUM_CERTIFICADO",
        "REFERENCIA",
        "TIPO",
        "ID",
        "ESTADO",
        "USUARIO_CREADOR",
        "USUARIO_APROBADOR",
    ];

    for (const key of exactFilters) {
        const value = filters[key];
        if (value) {
            conditions.push(`"${key}" = ?`);
            args.push(value);
        }
    }

    if (filters.FECHA_REGISTRO_DESDE && filters.FECHA_REGISTRO_HASTA) {
        conditions.push(`"FECHA_REGISTRO" BETWEEN ? AND ?`);
        args.push(filters.FECHA_REGISTRO_DESDE);
        args.push(filters.FECHA_REGISTRO_HASTA);
    }

    // Filter by EXISTS if provided
    if (filters.EXISTS !== undefined) {
        conditions.push(`"EXISTS" = ?`);
        args.push(filters.EXISTS ? 1 : 0);
    }

    const whereClause = ` WHERE ${conditions.join(" AND ")}`;
    const sql = `SELECT rowid as __rowid, * FROM ${DEPOSIT_ACTIVITY_TABLE}${whereClause} LIMIT 1;`;

    // Debug logging
    console.log("[DEBUG] Query SQL:", sql);
    console.log("[DEBUG] Query Args:", args);
    console.log("[DEBUG] Filters:", filters);

    const result = await turso.execute({ sql, args });

    console.log("[DEBUG] Result rows count:", result.rows.length);

    if (result.rows.length === 0) return null;

    // Convert row to record
    const row = result.rows[0];
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
        record[col] = row[idx];
    });

    console.log("[DEBUG QUERY RESULT] USED:", record.USED, "TIMES_USED:", record.TIMES_USED, "rowid:", record.__rowid);

    return record as (Record<string, unknown> & { __rowid?: number | null });
}

