
import { NextRequest, NextResponse } from "next/server";
import { findDepositByFilters, markDepositUsedByRowId, DepositsQueryFilters } from "@/lib/services/deposits";
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

    const filters: DepositsQueryFilters = {
        NUMERO_CONTRATO: getValue("NUMERO_CONTRATO"),
        NUM_PRODUCTO: getValue("NUM_PRODUCTO"),
        ID_PRODUCTO: getValue("ID_PRODUCTO"),
        ID_CUSTOMER: getValue("ID_CUSTOMER"),
        MONEDA: getValue("MONEDA"),
        PLAZO: getValue("PLAZO"),
        ESTADO_PRODUCTO: getValue("ESTADO_PRODUCTO"),
        FECHA_NEGOCIACION_HASTA: getValue("FECHA_NEGOCIACION_HASTA"),
        FECHA_EFECTIVA_DESDE: getValue("FECHA_EFECTIVA_DESDE"),
        FECHA_EFECTIVA_HASTA: getValue("FECHA_EFECTIVA_HASTA"),
    };

    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    if (!hasAnyFilter) {
        return respond({ message: "Debe enviar al menos un parametro de busqueda." }, 400);
    }

    // TODO: Add date validation logic if strict validation is needed
    // logic from express app.ts lines 225-245 can be added here.

    // Check if user wants to mark record as used (default: true)
    const shouldMarkUsed = getBooleanValue("USED") !== false; // true by default

    try {
        const result = await findDepositByFilters(filters);
        if (!result) {
            return respond({ message: "No se encontro ningun resultado." }, 404);
        }

        // Mark record as used only if USED parameter is not explicitly set to false
        if (shouldMarkUsed) {
            const rowId = result.__rowid;
            if (rowId !== undefined && rowId !== null && typeof rowId === 'number') {
                await markDepositUsedByRowId(rowId);
                const timesUsed = Number(result.TIMES_USED ?? 0);
                result.USED = 1; // SQLite boolean usually 1
                result.TIMES_USED = timesUsed + 1;
            }
        }

        const { __rowid, ...rest } = result;
        return respond({ data: rest });

    } catch (error) {
        return handleApiError(error, "querying deposits");
    }
}
