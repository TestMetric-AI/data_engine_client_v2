/**
 * Deposits DP10 — Database Table Setup & Insert Operations
 */
import { turso } from "@/lib/turso";
import type { InValue } from "@libsql/client";
import {
    DEPOSITS_DP10_TABLE,
    DEPOSITS_DP10_COLUMNS,
    DEPOSITS_DP10_EXTRA_COLUMNS,
    EXTRA_COLUMN_TYPES,
} from "./constants";
import { normalizeValue, getColumnType, calculateSafeBatchSize } from "./parsing";
import type { DepositsRow } from "./types";

// ── Table setup ────────────────────────────────────────────────────

async function ensureExtraColumns(): Promise<void> {
    // Pragma table_info returns cid, name, type, notnull, dflt_value, pk
    const infoResult = await turso.execute(`PRAGMA table_info(${DEPOSITS_DP10_TABLE});`);
    const existing = new Set<string>();

    infoResult.rows.forEach(row => {
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
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_DP10_TABLE}_customer ON ${DEPOSITS_DP10_TABLE}(ID_CUSTOMER);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_DP10_TABLE}_contract ON ${DEPOSITS_DP10_TABLE}(NUMERO_CONTRATO);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_DP10_TABLE}_effective_date ON ${DEPOSITS_DP10_TABLE}(FECHA_EFECTIVA);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_DP10_TABLE}_negotiation_date ON ${DEPOSITS_DP10_TABLE}(FECHA_NEGOCIACION);`);
    await turso.execute(`CREATE INDEX IF NOT EXISTS idx_${DEPOSITS_DP10_TABLE}_used ON ${DEPOSITS_DP10_TABLE}(USED);`);
}

// ── Insert & Clear ─────────────────────────────────────────────────

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
                args: batchValues as InValue[],
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
