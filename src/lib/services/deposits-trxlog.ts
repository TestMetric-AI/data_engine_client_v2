import { parse } from "csv-parse/sync";
import { z } from "zod";
import { turso } from "@/lib/turso";

export const DEPOSITS_TRXLOG_TABLE = "deposits_trxlog";

// CSV columns (what we expect in the uploaded file)
export const DEPOSITS_TRXLOG_CSV_COLUMNS = [
    "STMT_ENTRY_ID",
    "NUM_CONTRATO",
    "COD_TIPO_OPERACION",
    "COD_ESTADO_ULT_CIERRE",
    "BASE_PERIODICIDAD",
    "NUM_LIQUIDACION",
    "NUM_TRANSACCION",
    "COD_CLASE_TRX",
    "FECHA_CONTABILIZACION",
    "FECHA_REGISTRO",
    "FECHA_MOVIMIENTO",
    "COD_SIGNO_OPERACION",
    "COD_MONEDA",
    "TASA_OPERATIVA",
    "COD_COTIZACION",
    "COD_CARGO",
    "TIPO_BALANCE",
    "MONTO_IMPORTE_ORIGEN",
    "MONTO_IMPORTE_OPER",
    "REF_ACTIVIDAD",
    "COD_TRANSACCION",
];

// Database columns (includes tracking columns)
export const DEPOSITS_TRXLOG_COLUMNS = [
    ...DEPOSITS_TRXLOG_CSV_COLUMNS,
    "USED",
    "TIMES_USED",
];

/**
 * Get column type for SQLite schema
 */
function getColumnType(column: string): string {
    if (column === "USED") return "INTEGER DEFAULT 0";
    if (column === "TIMES_USED") return "INTEGER DEFAULT 0";
    // All other columns stored as TEXT for flexibility
    return "TEXT";
}

/**
 * Validate CSV headers
 */
function validateHeaders(headers: string[]): void {
    if (headers.length !== DEPOSITS_TRXLOG_CSV_COLUMNS.length) {
        throw new Error(
            `Invalid CSV: expected ${DEPOSITS_TRXLOG_CSV_COLUMNS.length} columns, got ${headers.length}`
        );
    }

    for (let i = 0; i < headers.length; i++) {
        if (headers[i] !== DEPOSITS_TRXLOG_CSV_COLUMNS[i]) {
            throw new Error(
                `Invalid CSV header at position ${i}: expected "${DEPOSITS_TRXLOG_CSV_COLUMNS[i]}", got "${headers[i]}"`
            );
        }
    }
}

/**
 * Parse CSV content
 */
export function parseDepositsTrxLogCSV(content: string): Record<string, string>[] {
    const records = parse(content, {
        delimiter: "|",
        skip_empty_lines: true,
        relax_column_count: false,
    });

    if (records.length === 0) {
        throw new Error("CSV file is empty");
    }

    // First row is headers
    const headers = records[0];
    validateHeaders(headers);

    // Convert remaining rows to objects
    const data: Record<string, string>[] = [];
    for (let i = 1; i < records.length; i++) {
        const row = records[i];
        const record: Record<string, string> = {};

        for (let j = 0; j < headers.length; j++) {
            const value = row[j];
            record[headers[j]] = value === "" ? "" : String(value);
        }

        data.push(record);
    }

    return data;
}

/**
 * Ensure deposits_trxlog table exists
 */
export async function ensureDepositsTrxLogTable(): Promise<void> {
    const columnDefs = DEPOSITS_TRXLOG_COLUMNS
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${DEPOSITS_TRXLOG_TABLE} (${columnDefs});`;
    await turso.execute(createSql);
}

/**
 * Clear all data from deposits_trxlog table
 */
export async function clearDepositsTrxLogTable(): Promise<void> {
    await ensureDepositsTrxLogTable();
    await turso.execute(`DELETE FROM ${DEPOSITS_TRXLOG_TABLE};`);
}

/**
 * Insert deposits_trxlog records in batches
 */
export async function insertDepositsTrxLogBatch(
    records: Record<string, string>[]
): Promise<void> {
    await ensureDepositsTrxLogTable();

    if (records.length === 0) return;

    const BATCH_SIZE = 500;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        const placeholders = batch
            .map(
                () =>
                    `(${DEPOSITS_TRXLOG_CSV_COLUMNS.map(() => "?").join(", ")})`
            )
            .join(", ");

        const values: any[] = [];
        for (const record of batch) {
            for (const column of DEPOSITS_TRXLOG_CSV_COLUMNS) {
                values.push(record[column] || null);
            }
        }

        const columnNames = DEPOSITS_TRXLOG_CSV_COLUMNS.map((c) => `"${c}"`).join(", ");
        const sql = `INSERT INTO ${DEPOSITS_TRXLOG_TABLE} (${columnNames}) VALUES ${placeholders};`;

        await turso.execute({ sql, args: values });
    }
}

/**
 * Get total count of deposits_trxlog records
 */
export async function getDepositsTrxLogCount(): Promise<number> {
    await ensureDepositsTrxLogTable();
    const result = await turso.execute(
        `SELECT COUNT(*) as count FROM ${DEPOSITS_TRXLOG_TABLE};`
    );
    return Number(result.rows[0].count);
}

export type DepositsTrxLogPage = {
    rows: Record<string, unknown>[];
    total: number;
};

/**
 * List deposits_trxlog records with pagination and search
 */
export async function listDepositsTrxLog(
    limit: number,
    offset: number,
    search?: string
): Promise<DepositsTrxLogPage> {
    await ensureDepositsTrxLogTable();

    let whereClause = "";
    const args: any[] = [];

    if (search && search.trim().length > 0) {
        const searchPattern = `%${search.trim()}%`;
        const searchConditions = DEPOSITS_TRXLOG_COLUMNS.map(
            (col) => `"${col}" LIKE ?`
        ).join(" OR ");
        whereClause = ` WHERE ${searchConditions}`;
        // Add search pattern for each column
        for (let i = 0; i < DEPOSITS_TRXLOG_COLUMNS.length; i++) {
            args.push(searchPattern);
        }
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM ${DEPOSITS_TRXLOG_TABLE}${whereClause};`;
    const countResult = await turso.execute({ sql: countSql, args });
    const total = Number(countResult.rows[0].count);

    // Get paginated data
    const dataSql = `SELECT * FROM ${DEPOSITS_TRXLOG_TABLE}${whereClause} LIMIT ? OFFSET ?;`;
    const dataResult = await turso.execute({
        sql: dataSql,
        args: [...args, limit, offset],
    });

    const rows: Record<string, unknown>[] = [];
    for (const row of dataResult.rows) {
        const record: Record<string, unknown> = {};
        dataResult.columns.forEach((col, idx) => {
            record[col] = row[idx];
        });
        rows.push(record);
    }

    return { rows, total };
}

/**
 * Migrate deposits_trxlog table to add USED tracking columns
 */
export async function migrateDepositsTrxLogUsedColumns(): Promise<void> {
    await ensureDepositsTrxLogTable();

    // Try to add USED column
    try {
        await turso.execute(
            `ALTER TABLE ${DEPOSITS_TRXLOG_TABLE} ADD COLUMN "USED" INTEGER DEFAULT 0;`
        );

    } catch (error) {
        // Column might already exist, ignore error

    }

    // Try to add TIMES_USED column
    try {
        await turso.execute(
            `ALTER TABLE ${DEPOSITS_TRXLOG_TABLE} ADD COLUMN "TIMES_USED" INTEGER DEFAULT 0;`
        );

    } catch (error) {
        // Column might already exist, ignore error

    }
}

/**
 * Mark a deposits_trxlog record as used by rowid
 */
export async function markDepositsTrxLogUsedByRowId(rowId: number): Promise<void> {
    await ensureDepositsTrxLogTable();



    const sql = `
        UPDATE ${DEPOSITS_TRXLOG_TABLE}
        SET "USED" = 1,
            "TIMES_USED" = COALESCE("TIMES_USED", 0) + 1
        WHERE rowid = ?;
    `;

    const result = await turso.execute({ sql, args: [rowId] });

}

export type DepositsTrxLogQueryFilters = {
    STMT_ENTRY_ID?: string;
    NUM_CONTRATO?: string;
    COD_TIPO_OPERACION?: string;
    COD_ESTADO_ULT_CIERRE?: string;
    BASE_PERIODICIDAD?: string;
    NUM_LIQUIDACION?: string;
    NUM_TRANSACCION?: string;
    COD_CLASE_TRX?: string;
    FECHA_CONTABILIZACION?: string;
    FECHA_REGISTRO?: string;
    FECHA_MOVIMIENTO?: string;
    COD_SIGNO_OPERACION?: string;
    COD_MONEDA?: string;
    TASA_OPERATIVA?: string;
    COD_COTIZACION?: string;
    COD_CARGO?: string;
    TIPO_BALANCE?: string;
    MONTO_IMPORTE_ORIGEN?: string;
    MONTO_IMPORTE_OPER?: string;
    REF_ACTIVIDAD?: string;
    COD_TRANSACCION?: string;
};

/**
 * Query deposits_trxlog by filters
 * Returns the first matching UNUSED record
 */
export async function findDepositsTrxLogByFilters(
    filters: DepositsTrxLogQueryFilters
): Promise<(Record<string, unknown> & { __rowid?: number | null }) | null> {
    await ensureDepositsTrxLogTable();
    await migrateDepositsTrxLogUsedColumns();

    const conditions: string[] = [];
    const args: any[] = [];

    // CRITICAL: Only return unused records
    conditions.push(`("USED" IS NULL OR "USED" = 0)`);

    // Add filter conditions for all possible columns
    const filterKeys = Object.keys(filters) as Array<keyof DepositsTrxLogQueryFilters>;
    for (const key of filterKeys) {
        const value = filters[key];
        if (value) {
            conditions.push(`"${key}" = ?`);
            args.push(value);
        }
    }

    const whereClause = ` WHERE ${conditions.join(" AND ")}`;
    const sql = `SELECT rowid as __rowid, * FROM ${DEPOSITS_TRXLOG_TABLE}${whereClause} LIMIT 1;`;



    const result = await turso.execute({ sql, args });

    if (result.rows.length === 0) return null;

    // Convert row to record
    const row = result.rows[0];
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
        record[col] = row[idx];
    });

    return record as Record<string, unknown> & { __rowid?: number | null };
}
