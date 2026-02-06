import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";

export const DEPOSITS_INTEREST_CHANGE_TABLE = "deposits_interest_change";

export const DEPOSITS_INTEREST_CHANGE_COLUMNS = [
    "NUM_CERTIFICADO",
    "TASA_INTERES_ANTERIOR",
    "TASA_POOL_ANTERIOR",
    "TASA_INTERES_NUEVA",
    "TASA_POOL_NUEVA",
    "FECHA_CAMBIO_TASA",
    "USUARIO_CAMBIO_TASA",
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
        DEPOSITS_INTEREST_CHANGE_COLUMNS.map((column) => {
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
    if (headers.length !== DEPOSITS_INTEREST_CHANGE_COLUMNS.length) {
        return {
            row: 1,
            column: "HEADER",
            value: headers.join("|"),
            message: "Cantidad de columnas invalida para deposits_interest_change.",
        };
    }

    for (let i = 0; i < DEPOSITS_INTEREST_CHANGE_COLUMNS.length; i += 1) {
        if (headers[i] !== DEPOSITS_INTEREST_CHANGE_COLUMNS[i]) {
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

    for (const column of DEPOSITS_INTEREST_CHANGE_COLUMNS) {
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

export async function ensureDepositsInterestChangeTable(): Promise<void> {
    const columnDefs = DEPOSITS_INTEREST_CHANGE_COLUMNS
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${DEPOSITS_INTEREST_CHANGE_TABLE} (${columnDefs});`;
    await turso.execute(createSql);
}

export async function insertDepositsInterestChange(rows: DepositsInterestChangeRow[]): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureDepositsInterestChangeTable();

    const BATCH_SIZE = 500; // Insert 500 rows at a time
    const columnsSql = DEPOSITS_INTEREST_CHANGE_COLUMNS.map((col) => `"${col}"`).join(", ");

    const transaction = await turso.transaction("write");

    try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            // Create multi-row INSERT statement
            const placeholderRows = batch
                .map(() => `(${DEPOSITS_INTEREST_CHANGE_COLUMNS.map(() => "?").join(", ")})`)
                .join(", ");

            const batchInsertSql = `INSERT INTO ${DEPOSITS_INTEREST_CHANGE_TABLE} (${columnsSql}) VALUES ${placeholderRows};`;

            // Flatten all values for the batch
            const batchValues = batch.flatMap((row) =>
                DEPOSITS_INTEREST_CHANGE_COLUMNS.map((column) =>
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

