/**
 * Deposits DP10 — Barrel re-export
 *
 * Re-exports all public symbols so consumers can continue importing
 * from "@/lib/services/deposits" without any changes.
 */

// Constants
export {
    DEPOSITS_DP10_TABLE,
    DEPOSITS_DP10_COLUMNS,
} from "./constants";

// Types
export type {
    DepositsValidationError,
    DepositsRow,
    DepositsParseResult,
    ReductionStats,
    DepositsQueryFilters,
    DepositsPage,
    BulkUpdateResult,
} from "./types";

// Parsing & validation
export {
    parseDepositsCsv,
    reduceDataByCategory,
    normalizeValue,
    getColumnType,
    calculateSafeBatchSize,
} from "./parsing";

// Database operations
export {
    ensureDepositsTable,
    insertDeposits,
    clearDeposits,
} from "./db";

// Query operations
export {
    findDepositByFilters,
    markDepositUsedByRowId,
    listDeposits,
} from "./queries";

// Customer operations
export {
    getDistinctCustomers,
    updateCustomerLegalInfo,
    updateExoneratedStatus,
    bulkUpdateCustomerLegalInfo,
} from "./customers";
