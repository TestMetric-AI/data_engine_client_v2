import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";

export const DEPOSIT_ACTIVITY_TABLE = "deposit_activity";

export const DEPOSIT_ACTIVITY_COLUMNS = [
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

    DEPOSIT_ACTIVITY_COLUMNS.forEach(col => {
        const value = row[col] || "";
        const values = value.split("]");
        columnValues[col] = values;
        maxValues = Math.max(maxValues, values.length);
    });

    // Create individual rows
    const result: Record<string, string>[] = [];
    for (let i = 0; i < maxValues; i++) {
        const newRow: Record<string, string> = {};
        DEPOSIT_ACTIVITY_COLUMNS.forEach(col => {
            // Use the i-th value if it exists, otherwise use the last value or empty string
            const values = columnValues[col];
            newRow[col] = values[i] !== undefined ? values[i] : (values[values.length - 1] || "");
        });
        result.push(newRow);
    }

    return result;
}

function validateHeaders(headers: string[]): DepositActivityValidationError | null {
    if (headers.length !== DEPOSIT_ACTIVITY_COLUMNS.length) {
        return {
            row: 1,
            column: "HEADER",
            value: headers.join("|"),
            message: "Cantidad de columnas invalida para deposit_activity.",
        };
    }

    for (let i = 0; i < headers.length; i++) {
        if (headers[i] !== DEPOSIT_ACTIVITY_COLUMNS[i]) {
            return {
                row: 1,
                column: headers[i],
                value: headers[i],
                message: `Columna esperada: ${DEPOSIT_ACTIVITY_COLUMNS[i]}, recibida: ${headers[i]}`,
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
    // All columns are TEXT for now
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

export async function listDepositActivity(
    limit: number,
    offset: number
): Promise<DepositActivityPage> {
    await ensureDepositActivityTable();

    const countResult = await turso.execute(
        `SELECT COUNT(*) as count FROM ${DEPOSIT_ACTIVITY_TABLE};`
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSIT_ACTIVITY_TABLE} ORDER BY FECHA_REGISTRO DESC LIMIT ? OFFSET ?;`,
        args: [limit, offset],
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
