import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";
import { Client } from "@libsql/client";

export const DEPOSITS_DP10_TABLE = "deposits_dp10";

export const DEPOSITS_DP10_COLUMNS = [
    "NUMERO_CONTRATO",
    "FECHA_NEGOCIACION",
    "FECHA_EFECTIVA",
    "CODIGO_OFICINA",
    "NUM_PRODUCTO",
    "NUM_PRODUCTO_LEGADO",
    "NUM_RECIBO_APERTURA",
    "NUM_RECIBO_CANCELACION",
    "ID_GRUPO_PRODUCTO",
    "ID_PRODUCTO",
    "MNEMONIC",
    "ID_CUSTOMER",
    "ID_CUSTOMER_ROLE",
    "MONTO_APERTURA",
    "MONEDA",
    "PLAZO",
    "ID_BASE_TIEMPO",
    "NUM_CERT_FISICO",
    "ID_METODO_FONDEO",
    "COD_VERIFICACION",
    "NUM_CTA_ORIG_LEGADO",
    "NUM_CTA_ORIG",
    "MONTO_ORIG_FONDEO",
    "MONTO_EFEC_FONDEO",
    "TIPO_CHEQUE",
    "MONTO_CHEQ_FONDEO",
    "MONTO_DP_CANCELADO",
    "CTA_BANCO_CENTRAL",
    "TASA_OPERACION",
    "TASA_POOL",
    "FREC_PAGO_INT",
    "TIPO_PAGO_INT",
    "ID_ACERCAMIENTO",
    "FORMA_PAGO_INT",
    "CTA_PAGO_INT_LEGADO",
    "CTA_PAGO_INT",
    "USR_REG_APERTURA",
    "FECHA_REG_APERTURA",
    "USR_APROBO_APERTURA",
    "FECHA_APROBO_APERTURA",
    "OFICIAL_RELACION",
    "ESTADO_PRODUCTO",
    "FECHA_VENCIMIENTO",
    "FECHA_ULT_RENOVACION",
    "FECHA_PROX_RENOVACION",
    "FECHA_PROXIMO_PAGO",
    "FECHA_ULT_MOVIMIENTO",
    "SALDO_CAPITAL_ACTUAL",
    "INTERES_ACUMULADO",
    "INTERES_DEVENGADO",
    "SALDO_CIERRE",
    "TOTAL_EMBARGO_PARCIAL",
    "CTA_INTERNA_FONDEO",
    "CTA_INTERNA_INT_PAGADEROS",
    "ID_MOTIVO_CANCELACION",
    "COMISION_MINIMA",
    "TIENE_SOLICITUD_EXONERACION",
    "USR_SOLICITA_EXONERACION",
    "FECHA_SOLICITUD_EXONERACION",
    "USR_APROBO_EXONERACION",
    "FECHA_APROBO_EXONERACION",
    "ESTADO_SOLICITUD_EXONERACION",
    "COMISION_CALCULADA",
    "COMISION_EXONERADA",
    "COMISION_PAGAR",
    "MONTO_RETEN_IMP_INT",
    "ID_FORMA_PAGO_CANCEL",
    "DESC_FORMA_PAGO_CANCEL",
    "CTA_CANCELACION_LEGADO",
    "CTA_CANCELACION",
    "ID_CANAL_CANCELACION",
    "CTA_CANCEL_CRE_CTA_INTERNA",
    "USR_REG_CANCELACION",
    "USR_APR_CANCELACION",
    "FECHA_REG_CANCELACION",
    "FECHA_APR_CANCELACION",
    "FECHA_CANCELACION",
    "REL_TITULARES",
    "FECHA_ORIG_CONTRATO",
];

const DEPOSITS_DP10_EXTRA_COLUMNS = [
    "LEGAL_ID",
    "LEGAL_DOC",
    "EXONERATED",
    "USED",
    "TIMES_USED",
];

const EXTRA_COLUMN_TYPES: Record<string, string> = {
    LEGAL_ID: "TEXT",
    LEGAL_DOC: "TEXT",
    EXONERATED: "BOOLEAN",
    USED: "BOOLEAN DEFAULT 0",
    TIMES_USED: "INTEGER DEFAULT 0",
};

const DECIMAL_FIELDS = new Set([
    "MONTO_APERTURA",
    "MONTO_ORIG_FONDEO",
    "MONTO_EFEC_FONDEO",
    "MONTO_CHEQ_FONDEO",
    "MONTO_DP_CANCELADO",
    "SALDO_CAPITAL_ACTUAL",
    "INTERES_ACUMULADO",
    "INTERES_DEVENGADO",
    "SALDO_CIERRE",
    "TOTAL_EMBARGO_PARCIAL",
    "COMISION_MINIMA",
    "COMISION_CALCULADA",
    "COMISION_EXONERADA",
    "COMISION_PAGAR",
    "MONTO_RETEN_IMP_INT",
]);

const RATE_FIELDS = new Set(["TASA_OPERACION", "TASA_POOL"]);

const DATE_8_FIELDS = new Set([
    "FECHA_EFECTIVA",
    "FECHA_VENCIMIENTO",
    "FECHA_ULT_RENOVACION",
    "FECHA_PROX_RENOVACION",
    "FECHA_PROXIMO_PAGO",
    "FECHA_ULT_MOVIMIENTO",
    "FECHA_CANCELACION",
    "FECHA_ORIG_CONTRATO",
]);

const DATE_10_FIELDS = new Set([
    "FECHA_NEGOCIACION",
    "FECHA_REG_APERTURA",
    "FECHA_APROBO_APERTURA",
    "FECHA_SOLICITUD_EXONERACION",
    "FECHA_APROBO_EXONERACION",
    "FECHA_REG_CANCELACION",
    "FECHA_APR_CANCELACION",
]);

const ENUM_FIELDS: Record<string, string[]> = {
    TIENE_SOLICITUD_EXONERACION: ["SI", "NO"],
};

const DECIMAL_REGEX = /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/;
const DATE_8_REGEX = /^\d{8}$/;
const DATE_10_REGEX = /^\d{10}$/;

function normalizeDate8(value: string): string {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function normalizeDate10(value: string): string {
    const year = `20${value.slice(0, 2)}`;
    const month = value.slice(2, 4);
    const day = value.slice(4, 6);
    return `${year}-${month}-${day}`;
}

export type DepositsValidationError = {
    row: number;
    column: string;
    value: string;
    message: string;
};

export type DepositsRow = Record<string, string | number | null>;

export type DepositsParseResult = {
    rows: DepositsRow[];
    errors: DepositsValidationError[];
};

export type ReductionStats = {
    originalCount: number;
    reducedCount: number;
    categoriesTotal: number;
    categoriesReduced: string[];
    reductionPercentage: number;
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

export async function ensureDepositsTable(): Promise<void> {
    const tableColumns = [
        ...DEPOSITS_DP10_COLUMNS,
        ...DEPOSITS_DP10_EXTRA_COLUMNS,
    ];
    const columnDefs = tableColumns
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${DEPOSITS_DP10_TABLE} (${columnDefs});`;
    await turso.execute(createSql);
    await ensureExtraColumns();
}

export async function insertDeposits(rows: DepositsRow[]): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureDepositsTable();

    const columnsSql = DEPOSITS_DP10_COLUMNS.map((col) => `"${col}"`).join(", ");

    // Calculate safe batch size based on column count
    const { batchSize: BATCH_SIZE, wasReduced } = calculateSafeBatchSize(
        DEPOSITS_DP10_COLUMNS.length,
        500 // Preferred batch size
    );

    if (wasReduced) {
        console.warn(
            `[DEPOSITS] Batch size reduced to ${BATCH_SIZE} rows to comply with SQLite's variable limit. ` +
            `(${DEPOSITS_DP10_COLUMNS.length} columns × ${BATCH_SIZE} rows = ${DEPOSITS_DP10_COLUMNS.length * BATCH_SIZE} variables, max: 32,766)`
        );
    }

    const transaction = await turso.transaction("write");

    try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            // Create multi-row INSERT statement
            const placeholderRows = batch
                .map(() => `(${DEPOSITS_DP10_COLUMNS.map(() => "?").join(", ")})`)
                .join(", ");

            const batchInsertSql = `INSERT INTO ${DEPOSITS_DP10_TABLE} (${columnsSql}) VALUES ${placeholderRows};`;

            // Flatten all values for the batch
            const batchValues = batch.flatMap((row) =>
                DEPOSITS_DP10_COLUMNS.map((column) =>
                    normalizeValue(column, row[column] ?? "")
                )
            );

            // LibSQL client handles types reasonably well.
            // We need to cast ensure values are primitives supported by SQLite.
            await transaction.execute({
                sql: batchInsertSql,
                args: batchValues as any[],
            });
        }
        await transaction.commit();
    } catch (error) {
        await transaction.close(); // In LibSQL, rollback is often implicit on close/error, but strict control is good.
        throw error;
    }

    return rows.length;
}

export async function clearDeposits(): Promise<void> {
    await ensureDepositsTable();
    await turso.execute(`DELETE FROM ${DEPOSITS_DP10_TABLE};`);
}

export type DepositsQueryFilters = {
    NUMERO_CONTRATO?: string;
    NUM_PRODUCTO?: string;
    ID_PRODUCTO?: string;
    ID_CUSTOMER?: string;
    MONEDA?: string;
    PLAZO?: string;
    ESTADO_PRODUCTO?: string;
    FECHA_NEGOCIACION_HASTA?: string;
    FECHA_EFECTIVA_DESDE?: string;
    FECHA_EFECTIVA_HASTA?: string;
};

export async function findDepositByFilters(
    filters: DepositsQueryFilters
): Promise<(Record<string, unknown> & { __rowid?: number | null }) | null> {
    await ensureDepositsTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // CRITICAL: Only return unused records
    conditions.push(`(USED IS NULL OR USED = 0)`);

    const exactFilters: Array<keyof DepositsQueryFilters> = [
        "NUMERO_CONTRATO",
        "NUM_PRODUCTO",
        "ID_PRODUCTO",
        "ID_CUSTOMER",
        "MONEDA",
        "PLAZO",
        "ESTADO_PRODUCTO",
    ];

    for (const key of exactFilters) {
        const value = filters[key];
        if (value) {
            conditions.push(`"${key}" = ?`);
            args.push(value);
        }
    }

    if (filters.FECHA_NEGOCIACION_HASTA) {
        conditions.push(`"FECHA_NEGOCIACION" <= ?`);
        args.push(filters.FECHA_NEGOCIACION_HASTA);
    }

    if (filters.FECHA_EFECTIVA_DESDE && filters.FECHA_EFECTIVA_HASTA) {
        conditions.push(`"FECHA_EFECTIVA" BETWEEN ? AND ?`);
        args.push(filters.FECHA_EFECTIVA_DESDE);
        args.push(filters.FECHA_EFECTIVA_HASTA);
    }

    const whereClause = ` WHERE ${conditions.join(" AND ")}`;
    const sql = `SELECT rowid as __rowid, * FROM ${DEPOSITS_DP10_TABLE}${whereClause} LIMIT 1;`;

    console.log("[DEBUG DEPOSITS QUERY] SQL:", sql);
    console.log("[DEBUG DEPOSITS QUERY] Args:", args);

    const result = await turso.execute({ sql, args });

    console.log("[DEBUG DEPOSITS QUERY] Result rows count:", result.rows.length);

    if (result.rows.length === 0) return null;

    // Convert row to record
    const row = result.rows[0];
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
        record[col] = row[idx];
    });

    console.log("[DEBUG DEPOSITS QUERY RESULT] USED:", record.USED, "TIMES_USED:", record.TIMES_USED, "rowid:", record.__rowid);

    return record as (Record<string, unknown> & { __rowid?: number | null });
}

export async function markDepositUsedByRowId(rowId: number): Promise<void> {
    await ensureDepositsTable();
    console.log("[DEBUG MARK USED - DEPOSITS] Marking rowid:", rowId);
    const result = await turso.execute({
        sql: `UPDATE ${DEPOSITS_DP10_TABLE}
          SET USED = 1,
              TIMES_USED = COALESCE(TIMES_USED, 0) + 1
          WHERE rowid = ?;`,
        args: [rowId],
    });
    console.log("[DEBUG MARK USED - DEPOSITS] Rows affected:", result.rowsAffected);
}

export type DepositsPage = {
    rows: Record<string, unknown>[];
    total: number;
};

export async function listDeposits(
    limit: number,
    offset: number,
    filters?: DepositsQueryFilters
): Promise<DepositsPage> {
    await ensureDepositsTable();

    const conditions: string[] = [];
    const args: any[] = [];

    // Build WHERE clause if filters are provided
    if (filters) {
        const exactFilters: Array<keyof DepositsQueryFilters> = [
            "NUMERO_CONTRATO",
            "NUM_PRODUCTO",
            "ID_PRODUCTO",
            "ID_CUSTOMER",
            "MONEDA",
            "PLAZO",
            "ESTADO_PRODUCTO",
        ];

        for (const key of exactFilters) {
            const value = filters[key];
            if (value) {
                conditions.push(`"${key}" = ?`);
                args.push(value);
            }
        }

        if (filters.FECHA_NEGOCIACION_HASTA) {
            conditions.push(`"FECHA_NEGOCIACION" <= ?`);
            args.push(filters.FECHA_NEGOCIACION_HASTA);
        }

        if (filters.FECHA_EFECTIVA_DESDE && filters.FECHA_EFECTIVA_HASTA) {
            conditions.push(`"FECHA_EFECTIVA" BETWEEN ? AND ?`);
            args.push(filters.FECHA_EFECTIVA_DESDE);
            args.push(filters.FECHA_EFECTIVA_HASTA);
        }
    }

    const whereClause =
        conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as total FROM ${DEPOSITS_DP10_TABLE}${whereClause};`,
        args: args,
    });
    const total = Number(countResult.rows[0][0] ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSITS_DP10_TABLE}${whereClause}
          ORDER BY FECHA_NEGOCIACION DESC, NUMERO_CONTRATO ASC
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

    if (DECIMAL_FIELDS.has(column) || RATE_FIELDS.has(column)) {
        return Number(value);
    }

    return value;
}

function getColumnType(column: string): string {
    const extraType = EXTRA_COLUMN_TYPES[column];
    if (extraType) {
        return extraType;
    }

    if (RATE_FIELDS.has(column) || DECIMAL_FIELDS.has(column)) {
        return "numeric"; // SQLite affinity
    }

    return "text";
}

async function ensureExtraColumns(): Promise<void> {
    // Pragma table_info returns cid, name, type, notnull, dflt_value, pk
    const infoResult = await turso.execute(`PRAGMA table_info(${DEPOSITS_DP10_TABLE});`);
    const existing = new Set<string>();

    infoResult.rows.forEach(row => {
        // name is usually the 2nd column (index 1) in SQLite pragma output
        // verify manually or map by column name if library provides it
        // LibSQL default response includes columns
        const nameIdx = infoResult.columns.indexOf("name");
        if (typeof row[nameIdx] === 'string') {
            existing.add(row[nameIdx] as string);
        }
    });


    for (const column of DEPOSITS_DP10_EXTRA_COLUMNS) {
        if (existing.has(column)) {
            continue;
        }
        const columnType = EXTRA_COLUMN_TYPES[column] ?? "TEXT";
        try {
            await turso.execute(
                `ALTER TABLE ${DEPOSITS_DP10_TABLE} ADD COLUMN "${column}" ${columnType};`
            );
        } catch (e) {
            // Ignore if column exists race condition
        }
    }
}

export async function getDistinctCustomers(): Promise<string[]> {
    await ensureDepositsTable();
    const result = await turso.execute(
        `SELECT DISTINCT ID_CUSTOMER FROM ${DEPOSITS_DP10_TABLE} 
         WHERE ID_CUSTOMER IS NOT NULL AND ID_CUSTOMER != '' 
         ORDER BY ID_CUSTOMER ASC;`
    );

    return result.rows.map((row) => row[0] as string);
}

export async function updateCustomerLegalInfo(
    idCustomer: string,
    legalId: string,
    legalDoc: string
): Promise<number> {
    await ensureDepositsTable();
    const result = await turso.execute({
        sql: `UPDATE ${DEPOSITS_DP10_TABLE} 
              SET LEGAL_ID = ?, LEGAL_DOC = ? 
              WHERE ID_CUSTOMER = ?;`,
        args: [legalId, legalDoc, idCustomer],
    });
    return result.rowsAffected;
}

export async function updateExoneratedStatus(): Promise<number> {
    await ensureDepositsTable();
    // Using subquery for SQLite update
    const result = await turso.execute(
        `UPDATE ${DEPOSITS_DP10_TABLE}
         SET EXONERATED = 1
         WHERE LEGAL_ID IN (SELECT NUMBER_PERSONAL_ID FROM client_exonerated)`
    );
    return result.rowsAffected;
}

export type BulkUpdateResult = {
    updated: number;
    notFound: Array<{ ID_CUSTOMER: string; reason: string }>;
    errors: Array<{ ID_CUSTOMER: string; error: string }>;
};

/**
 * Bulk update LEGAL_ID and LEGAL_DOC fields for multiple customers from CSV data
 * Continues updating valid records even if some fail
 * @param updates Array of {ID_CUSTOMER, LEGAL_ID, LEGAL_DOC} objects
 * @returns Object with counts of updated, notFound, and errors
 */
export async function bulkUpdateCustomerLegalInfo(
    updates: Array<{ ID_CUSTOMER: string; LEGAL_ID: string; LEGAL_DOC: string }>
): Promise<BulkUpdateResult> {
    await ensureDepositsTable();

    const result: BulkUpdateResult = {
        updated: 0,
        notFound: [],
        errors: [],
    };

    // Process each update individually (no transaction - partial updates allowed)
    for (const update of updates) {
        try {
            const { ID_CUSTOMER, LEGAL_ID, LEGAL_DOC } = update;

            // Check if customer exists
            const checkResult = await turso.execute({
                sql: `SELECT COUNT(*) as count FROM ${DEPOSITS_DP10_TABLE} WHERE ID_CUSTOMER = ?;`,
                args: [ID_CUSTOMER],
            });

            const count = Number(checkResult.rows[0]?.[0] ?? 0);

            if (count === 0) {
                result.notFound.push({
                    ID_CUSTOMER,
                    reason: "Customer not found",
                });
                continue;
            }

            // Update the record
            const updateResult = await turso.execute({
                sql: `UPDATE ${DEPOSITS_DP10_TABLE} SET LEGAL_ID = ?, LEGAL_DOC = ? WHERE ID_CUSTOMER = ?;`,
                args: [LEGAL_ID, LEGAL_DOC, ID_CUSTOMER],
            });

            if (updateResult.rowsAffected > 0) {
                result.updated += updateResult.rowsAffected;
            } else {
                result.notFound.push({
                    ID_CUSTOMER,
                    reason: "Update failed - no rows affected",
                });
            }
        } catch (error) {
            result.errors.push({
                ID_CUSTOMER: update.ID_CUSTOMER,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return result;
}


