/**
 * Deposits DP10 — Customer Update Operations
 */
import { turso } from "@/lib/turso";
import { DEPOSITS_DP10_TABLE } from "./constants";
import { ensureDepositsTable } from "./db";
import type { BulkUpdateResult } from "./types";

// ── Single customer operations ─────────────────────────────────────

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

// ── Bulk operations ────────────────────────────────────────────────

/**
 * Bulk update LEGAL_ID and LEGAL_DOC fields for multiple customers from CSV data
 * Uses a transaction to ensure atomicity — all updates succeed or none are applied
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

    const transaction = await turso.transaction("write");

    try {
        for (const update of updates) {
            const { ID_CUSTOMER, LEGAL_ID, LEGAL_DOC } = update;

            const updateResult = await transaction.execute({
                sql: `UPDATE ${DEPOSITS_DP10_TABLE} SET LEGAL_ID = ?, LEGAL_DOC = ? WHERE ID_CUSTOMER = ?;`,
                args: [LEGAL_ID, LEGAL_DOC, ID_CUSTOMER],
            });

            if (updateResult.rowsAffected > 0) {
                result.updated += updateResult.rowsAffected;
            } else {
                result.notFound.push({
                    ID_CUSTOMER,
                    reason: "Customer not found",
                });
            }
        }

        await transaction.commit();
    } catch (error) {
        await transaction.close();
        throw error;
    }

    return result;
}
