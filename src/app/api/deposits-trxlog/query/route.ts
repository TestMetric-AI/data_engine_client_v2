import { NextRequest, NextResponse } from "next/server";
import {
    findDepositsTrxLogByFilters,
    markDepositsTrxLogUsedByRowId,
    DepositsTrxLogQueryFilters,
} from "@/lib/services/deposits-trxlog";
import { handleApiError } from "@/lib/api-error-handler";
import { verifyApiAuth } from "@/lib/auth-helper";
import { checkRateLimit } from "@/lib/rate-limit";
import { logApiRequestMetrics } from "@/lib/request-metrics";

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    const respond = (body: unknown, status = 200) => {
        logApiRequestMetrics(request, status, startedAt, body);
        return NextResponse.json(body, { status });
    };

    if (!(await verifyApiAuth(request))) {
        return respond({ message: "Unauthorized" }, 401);
    }

    const rate = checkRateLimit(request, 60, 60_000);
    if (!rate.allowed) {
        return respond(
            { message: "Too many requests", retryAfterSeconds: rate.retryAfterSeconds },
            429
        );
    }

    const searchParams = request.nextUrl.searchParams;

    const getValue = (key: string): string | undefined => {
        const val = searchParams.get(key);
        if (!val) return undefined;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    const getBooleanValue = (key: string): boolean | undefined => {
        const val = searchParams.get(key);
        if (!val) return undefined;
        const trimmed = val.trim().toLowerCase();
        if (trimmed === "true" || trimmed === "1") return true;
        if (trimmed === "false" || trimmed === "0") return false;
        return undefined;
    };

    const filters: DepositsTrxLogQueryFilters = {
        STMT_ENTRY_ID: getValue("STMT_ENTRY_ID"),
        NUM_CONTRATO: getValue("NUM_CONTRATO"),
        COD_TIPO_OPERACION: getValue("COD_TIPO_OPERACION"),
        COD_ESTADO_ULT_CIERRE: getValue("COD_ESTADO_ULT_CIERRE"),
        BASE_PERIODICIDAD: getValue("BASE_PERIODICIDAD"),
        NUM_LIQUIDACION: getValue("NUM_LIQUIDACION"),
        NUM_TRANSACCION: getValue("NUM_TRANSACCION"),
        COD_CLASE_TRX: getValue("COD_CLASE_TRX"),
        FECHA_CONTABILIZACION: getValue("FECHA_CONTABILIZACION"),
        FECHA_REGISTRO: getValue("FECHA_REGISTRO"),
        FECHA_MOVIMIENTO: getValue("FECHA_MOVIMIENTO"),
        COD_SIGNO_OPERACION: getValue("COD_SIGNO_OPERACION"),
        COD_MONEDA: getValue("COD_MONEDA"),
        TASA_OPERATIVA: getValue("TASA_OPERATIVA"),
        COD_COTIZACION: getValue("COD_COTIZACION"),
        COD_CARGO: getValue("COD_CARGO"),
        TIPO_BALANCE: getValue("TIPO_BALANCE"),
        MONTO_IMPORTE_ORIGEN: getValue("MONTO_IMPORTE_ORIGEN"),
        MONTO_IMPORTE_OPER: getValue("MONTO_IMPORTE_OPER"),
        REF_ACTIVIDAD: getValue("REF_ACTIVIDAD"),
        COD_TRANSACCION: getValue("COD_TRANSACCION"),
    };


    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    if (!hasAnyFilter) {
        return respond(
            { message: "Must provide at least one search parameter." },
            400
        );
    }

    // Check if user wants to mark record as used (default: true)
    const shouldMarkUsed = getBooleanValue("USED") !== false; // true by default

    try {
        const result = await findDepositsTrxLogByFilters(filters);
        if (!result) {
            return respond(
                { message: "No matching record found." },
                404
            );
        }

        // Mark record as used only if USED parameter is not explicitly set to false
        if (shouldMarkUsed) {
            const rowId = result.__rowid;
            if (rowId !== undefined && rowId !== null && typeof rowId === "number") {
                await markDepositsTrxLogUsedByRowId(rowId);
                const timesUsed = Number(result.TIMES_USED ?? 0);
                result.USED = 1;
                result.TIMES_USED = timesUsed + 1;
            }
        }

        const { __rowid, ...rest } = result;
        return respond({ data: rest });
    } catch (error) {
        return handleApiError(error, "querying deposits trxlog");
    }
}
