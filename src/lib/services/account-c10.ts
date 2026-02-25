import { turso } from "@/lib/turso";
import type { InValue } from "@libsql/client";

export const ACCOUNT_C10_TABLE = "account_c10";

export const ACCOUNT_C10_COLUMNS = [
    "arrangement_id",
    "company_code",
    "arrangement_status",
    "product_id",
    "cleared_balance",
    "ledger_balance",
    "locked_balance",
    "working_balance",
    "product_group_id",
    "available_balance",
    "account_id",
    "officer_name",
    "currency",
    "legal_doc_name",
    "legal_id",
    "officer_id",
];

export const ACCOUNT_C10_EXTRA_COLUMNS = [
    "created_at",
    "updated_at",
];

export const EXTRA_COLUMN_TYPES: Record<string, string> = {
    created_at: "TEXT DEFAULT CURRENT_TIMESTAMP", // ISO strings
    updated_at: "TEXT DEFAULT CURRENT_TIMESTAMP",
};

/**
 * Get SQLite column type based on the requested schema.
 */
function getColumnType(column: string): string {
    switch (column) {
        case "arrangement_id":
        case "currency":
            return "TEXT NOT NULL";
        case "company_code":
        case "arrangement_status":
        case "product_id":
        case "product_group_id":
        case "officer_name":
        case "legal_doc_name":
        case "legal_id":
            return "TEXT";
        case "cleared_balance":
        case "ledger_balance":
        case "locked_balance":
        case "working_balance":
        case "available_balance":
            return "REAL"; // Float
        case "account_id":
            return "INTEGER NOT NULL"; // Int
        case "officer_id":
            return "INTEGER"; // Int nullable
        default:
            return EXTRA_COLUMN_TYPES[column] ?? "TEXT";
    }
}

/**
 * Execute DDL to ensure that the account_c10 table exists
 * and all columns have correct definitions.
 */
export async function ensureAccountC10Table(): Promise<void> {
    const tableColumns = [
        ...ACCOUNT_C10_COLUMNS,
        ...ACCOUNT_C10_EXTRA_COLUMNS,
    ];

    // SQLite uses rowid normally, we don't necessarily have to define a primary key id,
    // but the schema implies an implicit ID from Turso logic. We'll use id implicitly 
    // or rely on arrangement_id or rowid for unique identifications.
    // For exact match with previous designs, we can define `id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))`
    // Alternatively, we just use standard column definitions.

    const columnDefs = tableColumns
        .map((column) => {
            const type = getColumnType(column);
            return `"${column}" ${type}`;
        })
        .join(", ");

    const createSql = `
      CREATE TABLE IF NOT EXISTS ${ACCOUNT_C10_TABLE} (
        id TEXT PRIMARY KEY,
        ${columnDefs}
      );
    `;

    await turso.execute(createSql);

    // Indexes
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${ACCOUNT_C10_TABLE}_account ON ${ACCOUNT_C10_TABLE}(account_id);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${ACCOUNT_C10_TABLE}_arrangement ON ${ACCOUNT_C10_TABLE}(arrangement_id);`);
}

/**
 * Clear data from the account_c10 table
 */
export async function clearAccountC10Table(): Promise<void> {
    await ensureAccountC10Table();
    await turso.execute(`DELETE FROM ${ACCOUNT_C10_TABLE};`);
}

export type AccountC10Row = Record<string, string | number | null>;

/**
 * Insert account_c10 records in batches.
 */
export async function insertAccountC10Batch(rows: AccountC10Row[]): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureAccountC10Table();

    // In a production context, UUID V4 could be generated client-side for "id",
    // or server side. For simplicity, we use crypto.randomUUID or similar if needed,
    // but let's just create an ID query via SQLite wrapper default.
    const allColumns = ["id", ...ACCOUNT_C10_COLUMNS];
    const columnsSql = allColumns.map((col) => `"${col}"`).join(", ");

    // Max SQLite variables per insert: 32766. Safe batch calculation:
    const varsPerRow = allColumns.length;
    const batchSize = Math.floor(30000 / varsPerRow);

    const transaction = await turso.transaction("write");

    try {
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            // Create multi-row INSERT statement
            const dbReadyBatchValues: InValue[] = [];

            const placeholders = batch
                .map((row) => {
                    // ID mapping
                    let idVal: string = "";
                    if (row.id) {
                        idVal = String(row.id);
                    } else if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        idVal = crypto.randomUUID();
                    } else {
                        // Fallback fallback
                        idVal = Math.random().toString(36).substring(2, 15);
                    }

                    dbReadyBatchValues.push(idVal);

                    // Push other columns
                    for (const column of ACCOUNT_C10_COLUMNS) {
                        dbReadyBatchValues.push((row[column] ?? null) as InValue);
                    }
                    return `(${allColumns.map(() => "?").join(", ")})`;
                })
                .join(", ");

            const batchInsertSql = `INSERT INTO ${ACCOUNT_C10_TABLE} (${columnsSql}) VALUES ${placeholders};`;

            await transaction.execute({
                sql: batchInsertSql,
                args: dbReadyBatchValues,
            });
        }
        await transaction.commit();
    } catch (error) {
        await transaction.close();
        throw error;
    }

    return rows.length;
}

/**
 * Get count of account_c10 records
 */
export async function getAccountC10Count(): Promise<number> {
    const result = await turso.execute(
        `SELECT COUNT(*) as count FROM ${ACCOUNT_C10_TABLE};`
    );
    return Number(result.rows[0].count);
}
