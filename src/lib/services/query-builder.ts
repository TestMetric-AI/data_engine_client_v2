/**
 * Shared SQL query-builder utilities for Turso/LibSQL services.
 *
 * Eliminates duplicated WHERE-clause construction, date-range filters,
 * boolean filters, and row-to-record conversion across all deposit services.
 */
import type { ResultSet, InValue } from "@libsql/client";

// ── Types ──────────────────────────────────────────────────────────

export type WhereClause = {
    conditions: string[];
    args: InValue[];
};

// ── Filter builders ────────────────────────────────────────────────

/**
 * Create a fresh WhereClause accumulator, optionally seeded with
 * an "unused records only" condition.
 */
export function createWhereClause(unusedOnly = false): WhereClause {
    const wc: WhereClause = { conditions: [], args: [] };
    if (unusedOnly) {
        wc.conditions.push(`("USED" IS NULL OR "USED" = 0)`);
    }
    return wc;
}

/**
 * Append `"KEY" = ?` conditions for every truthy value in `filters`
 * whose key is listed in `keys`.
 */
export function addExactFilters<F extends Record<string, any>>(
    wc: WhereClause,
    filters: F,
    keys: (keyof F & string)[]
): void {
    for (const key of keys) {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== "") {
            wc.conditions.push(`"${key}" = ?`);
            wc.args.push(value);
        }
    }
}

/**
 * Append a `"column" BETWEEN ? AND ?` condition when both `fromKey`
 * and `toKey` are present in `filters`.
 */
export function addDateRange<F extends Record<string, any>>(
    wc: WhereClause,
    filters: F,
    fromKey: keyof F & string,
    toKey: keyof F & string,
    column: string
): void {
    const from = filters[fromKey];
    const to = filters[toKey];
    if (from && to) {
        wc.conditions.push(`"${column}" BETWEEN ? AND ?`);
        wc.args.push(from);
        wc.args.push(to);
    }
}

/**
 * Append a `"column" <= ?` condition when the key is present.
 */
export function addMaxFilter<F extends Record<string, any>>(
    wc: WhereClause,
    filters: F,
    key: keyof F & string,
    column?: string
): void {
    const value = filters[key];
    if (value) {
        wc.conditions.push(`"${column ?? key}" <= ?`);
        wc.args.push(value);
    }
}

/**
 * Append a boolean filter, casting true/false → 1/0.
 */
export function addBooleanFilter<F extends Record<string, any>>(
    wc: WhereClause,
    filters: F,
    key: keyof F & string,
    column?: string
): void {
    const value = filters[key];
    if (value !== undefined) {
        wc.conditions.push(`"${column ?? key}" = ?`);
        wc.args.push(value ? 1 : 0);
    }
}

// ── WHERE assembly ─────────────────────────────────────────────────

/**
 * Build the final ` WHERE ...` string (with leading space) or empty string.
 */
export function toWhereSQL(wc: WhereClause): string {
    if (wc.conditions.length === 0) return "";
    return ` WHERE ${wc.conditions.join(" AND ")}`;
}

// ── Row conversion ─────────────────────────────────────────────────

/**
 * Convert a single LibSQL result row into a plain record.
 */
export function rowToRecord(result: ResultSet, rowIndex = 0): Record<string, unknown> {
    const row = result.rows[rowIndex];
    const record: Record<string, unknown> = {};
    result.columns.forEach((col, idx) => {
        record[col] = row[idx];
    });
    return record;
}

/**
 * Convert all LibSQL result rows into plain records.
 */
export function rowsToRecords(result: ResultSet): Record<string, unknown>[] {
    return result.rows.map((row) => {
        const record: Record<string, unknown> = {};
        result.columns.forEach((col, idx) => {
            record[col] = row[idx];
        });
        return record;
    });
}
