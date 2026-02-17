/**
 * Deposits DP10 — Query Operations
 */
import { turso } from "@/lib/turso";
import { DEPOSITS_DP10_TABLE } from "./constants";
import { ensureDepositsTable } from "./db";
import {
    createWhereClause,
    addExactFilters,
    addDateRange,
    addMaxFilter,
    toWhereSQL,
    rowToRecord,
    rowsToRecords,
} from "../query-builder";
import type { DepositsQueryFilters, DepositsPage } from "./types";

// ── Single record query ────────────────────────────────────────────

export async function findDepositByFilters(
    filters: DepositsQueryFilters
): Promise<(Record<string, unknown> & { __rowid?: number | null }) | null> {
    await ensureDepositsTable();

    const wc = createWhereClause(/* unusedOnly */ true);

    addExactFilters(wc, filters, [
        "NUMERO_CONTRATO",
        "NUM_PRODUCTO",
        "ID_PRODUCTO",
        "ID_CUSTOMER",
        "MONEDA",
        "PLAZO",
        "ESTADO_PRODUCTO",
    ]);

    addMaxFilter(wc, filters, "FECHA_NEGOCIACION_HASTA", "FECHA_NEGOCIACION");
    addDateRange(wc, filters, "FECHA_EFECTIVA_DESDE", "FECHA_EFECTIVA_HASTA", "FECHA_EFECTIVA");

    const sql = `SELECT rowid as __rowid, * FROM ${DEPOSITS_DP10_TABLE}${toWhereSQL(wc)} LIMIT 1;`;
    const result = await turso.execute({ sql, args: wc.args });

    if (result.rows.length === 0) return null;

    return rowToRecord(result) as (Record<string, unknown> & { __rowid?: number | null });
}

// ── Mark as used ───────────────────────────────────────────────────

export async function markDepositUsedByRowId(rowId: number): Promise<void> {
    await ensureDepositsTable();

    await turso.execute({
        sql: `UPDATE ${DEPOSITS_DP10_TABLE}
          SET USED = 1,
              TIMES_USED = COALESCE(TIMES_USED, 0) + 1
          WHERE rowid = ?;`,
        args: [rowId],
    });
}

// ── Paginated listing ──────────────────────────────────────────────

export async function listDeposits(
    limit: number,
    offset: number,
    filters?: DepositsQueryFilters
): Promise<DepositsPage> {
    await ensureDepositsTable();

    const wc = createWhereClause();

    if (filters) {
        addExactFilters(wc, filters, [
            "NUMERO_CONTRATO",
            "NUM_PRODUCTO",
            "ID_PRODUCTO",
            "ID_CUSTOMER",
            "MONEDA",
            "PLAZO",
            "ESTADO_PRODUCTO",
        ]);

        addMaxFilter(wc, filters, "FECHA_NEGOCIACION_HASTA", "FECHA_NEGOCIACION");
        addDateRange(wc, filters, "FECHA_EFECTIVA_DESDE", "FECHA_EFECTIVA_HASTA", "FECHA_EFECTIVA");
    }

    const whereSQL = toWhereSQL(wc);

    const countResult = await turso.execute({
        sql: `SELECT COUNT(*) as total FROM ${DEPOSITS_DP10_TABLE}${whereSQL};`,
        args: wc.args,
    });
    const total = Number(countResult.rows[0][0] ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${DEPOSITS_DP10_TABLE}${whereSQL}
          ORDER BY FECHA_NEGOCIACION DESC, NUMERO_CONTRATO ASC
          LIMIT ? OFFSET ?;`,
        args: [...wc.args, limit, offset],
    });

    return { rows: rowsToRecords(dataResult), total };
}
