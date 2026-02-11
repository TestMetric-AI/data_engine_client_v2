import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";

export const DEPOSITS_LOCKED_TABLE = "deposits_locked";

export const DEPOSITS_LOCKED_COLUMNS = [
    "ID_BLOQUEO",
    "ID_PRODUCTO",
    "ID_CUSTOMER",
    "ID_TIPO_BLOQUEO",
    "DESC_TIPO_BLOQUEO",
    "ESTADO_BLOQUEO",
    "MONTO_BLOQUEO",
    "FECHA_INICIO",
    "FECHA_FIN",
    "ID_PRODUCTO_GARANTIZADO",
];

const DECIMAL_FIELDS = new Set(["MONTO_BLOQUEO"]);

const DATE_8_FIELDS = new Set(["FECHA_INICIO", "FECHA_FIN"]);

const DECIMAL_REGEX = /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
const DATE_8_REGEX = /^\d{8}$/;

function normalizeDate8(value: string): string {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export type DepositsLockedValidationError = {
    row: number;
    column: string;
    value: string;
    message: string;
};

export type DepositsLockedRow = Record<string, string | number | null>;

export type DepositsLockedParseResult = {
    rows: DepositsLockedRow[];
    errors: DepositsLockedValidationError[];
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

const depositsLockedRowSchema: z.ZodType<DepositsLockedRow> = z.object(
    Object.fromEntries(
        DEPOSITS_LOCKED_COLUMNS.map((column) => {
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
) as z.ZodType<DepositsLockedRow>;

export function parseDepositsLockedCsv(buffer: Buffer): DepositsLockedParseResult {
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

    const errors: DepositsLockedValidationError[] = [];
    const headerError = validateHeaders(headers);
    if (headerError) {
        errors.push(headerError);
        return { rows: [], errors };
    }

    const normalizedRows: DepositsLockedRow[] = [];

    records.forEach((row, index) => {
        const rowNumber = index + 2;
        const rowErrors = validateRow(row, rowNumber);
        errors.push(...rowErrors);
        if (rowErrors.length > 0) {
            return;
        }

        const normalized = depositsLockedRowSchema.safeParse(row);
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

function validateHeaders(headers: string[]): DepositsLockedValidationError | null {
    if (headers.length !== DEPOSITS_LOCKED_COLUMNS.length) {
        return {
            row: 1,
            column: "HEADER",
            value: headers.join("|"),
            message: "Cantidad de columnas invalida para deposits_locked.",
        };
    }

    for (let i = 0; i < DEPOSITS_LOCKED_COLUMNS.length; i += 1) {
        if (headers[i] !== DEPOSITS_LOCKED_COLUMNS[i]) {
            return {
                row: 1,
                column: "HEADER",
                value: headers.join("|"),
                message:
                    "El orden o los nombres de columnas no coinciden con deposits_locked.",
            };
        }
    }

    return null;
}

function validateRow(
    row: Record<string, string>,
    rowNumber: number
): DepositsLockedValidationError[] {
    const errors: DepositsLockedValidationError[] = [];

    for (const column of DEPOSITS_LOCKED_COLUMNS) {
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

export async function ensureDepositsLockedTable(): Promise<void> {
    const columnDefs = DEPOSITS_LOCKED_COLUMNS
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${DEPOSITS_LOCKED_TABLE} (${columnDefs});`;
    await turso.execute(createSql);
}

export async function insertDepositsLocked(rows: DepositsLockedRow[]): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureDepositsLockedTable();

    const BATCH_SIZE = 500; // Insert 500 rows at a time
    const columnsSql = DEPOSITS_LOCKED_COLUMNS.map((col) => `"${col}"`).join(", ");

    const transaction = await turso.transaction("write");

    try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            // Create multi-row INSERT statement
            const placeholderRows = batch
                .map(() => `(${DEPOSITS_LOCKED_COLUMNS.map(() => "?").join(", ")})`)
                .join(", ");

            const batchInsertSql = `INSERT INTO ${DEPOSITS_LOCKED_TABLE} (${columnsSql}) VALUES ${placeholderRows};`;

            // Flatten all values for the batch
            const batchValues = batch.flatMap((row) =>
                DEPOSITS_LOCKED_COLUMNS.map((column) =>
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

export async function clearDepositsLocked(): Promise<void> {
    await ensureDepositsLockedTable();
    await turso.execute(`DELETE FROM ${DEPOSITS_LOCKED_TABLE};`);
}

export type DepositsLockedPage = {
    rows: Record<string, unknown>[];
    total: number;
};

// Pagination filter type (subset of query filters)
export type DepositsLockedPaginationFilters = {
    ID_BLOQUEO?: string;
    ID_PRODUCTO?: string;
    ID_CUSTOMER?: string;
    ID_TIPO_BLOQUEO?: string;
    ESTADO_BLOQUEO?: string;
    FECHA_INICIO_DESDE?: string;
    FECHA_INICIO_HASTA?: string;
};

export async function listDepositsLocked(
    limit: number,
    offset: number,
    filters?: DepositsLockedPaginationFilters
): Promise<DepositsLockedPage> {
    await ensureDepositsLockedTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // Build WHERE clause if filters are provided
    if (filters) {
        const exactFilters: Array<keyof DepositsLockedPaginationFilters> = [
            "ID_BLOQUEO",
            "ID_PRODUCTO",
            "ID_CUSTOMER",
            "ID_TIPO_BLOQUEO",
            "ESTADO_BLOQUEO",
        ];

        for (const key of exactFilters) {
            const value = filters[key];
            if (value) {
                conditions.push(`"${key}" = ?`);
                args.push(value);
            }
        }

        if (filters.FECHA_INICIO_DESDE && filters.FECHA_INICIO_HASTA) {
            conditions.push(`"FECHA_INICIO" BETWEEN ? AND ?`);
            args.push(filters.FECHA_INICIO_DESDE);
            args.push(filters.FECHA_INICIO_HASTA);
        }
    }

    const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as total FROM ${DEPOSITS_LOCKED_TABLE}${whereClause};`,
        args: args,
    });
    const total = Number(countResult.rows[0][0] ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSITS_LOCKED_TABLE}${whereClause}
          ORDER BY FECHA_INICIO DESC, ID_BLOQUEO ASC
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

// Query API functions
export type DepositsLockedQueryFilters = {
    ID_BLOQUEO?: string;
    ID_PRODUCTO?: string;
    ID_CUSTOMER?: string;
    ID_TIPO_BLOQUEO?: string;
    ESTADO_BLOQUEO?: string;
    FECHA_INICIO_DESDE?: string;
    FECHA_INICIO_HASTA?: string;
};

export async function findDepositsLockedByFilters(
    filters: DepositsLockedQueryFilters
): Promise<(Record<string, unknown> & { __rowid?: number | null }) | null> {
    await ensureDepositsLockedTable();

    const conditions: string[] = [];
    const args: any[] = [];

    const exactFilters: Array<keyof DepositsLockedQueryFilters> = [
        "ID_BLOQUEO",
        "ID_PRODUCTO",
        "ID_CUSTOMER",
        "ID_TIPO_BLOQUEO",
        "ESTADO_BLOQUEO",
    ];

    for (const key of exactFilters) {
        const value = filters[key];
        if (value) {
            conditions.push(`"${key}" = ?`);
            args.push(value);
        }
    }

    if (filters.FECHA_INICIO_DESDE && filters.FECHA_INICIO_HASTA) {
        conditions.push(`"FECHA_INICIO" BETWEEN ? AND ?`);
        args.push(filters.FECHA_INICIO_DESDE);
        args.push(filters.FECHA_INICIO_HASTA);
    }

    const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT rowid as __rowid, * FROM ${DEPOSITS_LOCKED_TABLE}${whereClause} LIMIT 1;`;

    const result = await turso.execute({ sql, args });

    if (result.rows.length === 0) return null;

    // Convert row to record
    const row = result.rows[0];
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
        record[col] = row[idx];
    });

    return record as (Record<string, unknown> & { __rowid?: number | null });
}

export async function markDepositsLockedUsedByRowId(rowId: number): Promise<void> {
    await ensureDepositsLockedTable();

    // First check if USED and TIMES_USED columns exist, if not add them
    const alterSql1 = `ALTER TABLE ${DEPOSITS_LOCKED_TABLE} ADD COLUMN USED INTEGER DEFAULT 0;`;
    const alterSql2 = `ALTER TABLE ${DEPOSITS_LOCKED_TABLE} ADD COLUMN TIMES_USED INTEGER DEFAULT 0;`;

    try {
        await turso.execute(alterSql1);
    } catch (error) {
        // Column might already exist, ignore error
    }

    try {
        await turso.execute(alterSql2);
    } catch (error) {
        // Column might already exist, ignore error
    }

    await turso.execute({
        sql: `UPDATE ${DEPOSITS_LOCKED_TABLE}
          SET USED = 1,
              TIMES_USED = COALESCE(TIMES_USED, 0) + 1
          WHERE rowid = ?;`,
        args: [rowId],
    });
}

