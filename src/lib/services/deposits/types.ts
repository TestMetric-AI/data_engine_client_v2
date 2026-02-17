/**
 * Deposits DP10 — Type Definitions
 */

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

export type DepositsPage = {
    rows: Record<string, unknown>[];
    total: number;
};

export type BulkUpdateResult = {
    updated: number;
    notFound: Array<{ ID_CUSTOMER: string; reason: string }>;
    errors: Array<{ ID_CUSTOMER: string; error: string }>;
};
