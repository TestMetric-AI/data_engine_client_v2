import { NextRequest, NextResponse } from "next/server";
import { findDepositsLockedByFilters, markDepositsLockedUsedByRowId, DepositsLockedQueryFilters } from "@/lib/services/deposits-locked";
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

    const filters: DepositsLockedQueryFilters = {
        ID_BLOQUEO: getValue("ID_BLOQUEO"),
        ID_PRODUCTO: getValue("ID_PRODUCTO"),
        ID_CUSTOMER: getValue("ID_CUSTOMER"),
        ID_TIPO_BLOQUEO: getValue("ID_TIPO_BLOQUEO"),
        ESTADO_BLOQUEO: getValue("ESTADO_BLOQUEO"),
        FECHA_INICIO_DESDE: getValue("FECHA_INICIO_DESDE"),
        FECHA_INICIO_HASTA: getValue("FECHA_INICIO_HASTA"),
    };

    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    if (!hasAnyFilter) {
        return respond({ message: "Debe enviar al menos un parametro de busqueda." }, 400);
    }

    try {
        const result = await findDepositsLockedByFilters(filters);
        if (!result) {
            return respond({ message: "No se encontro ningun resultado." }, 404);
        }

        const rowId = result.__rowid;
        if (rowId !== undefined && rowId !== null && typeof rowId === 'number') {
            await markDepositsLockedUsedByRowId(rowId);
            const timesUsed = Number(result.TIMES_USED ?? 0);
            result.USED = 1; // SQLite boolean usually 1
            result.TIMES_USED = timesUsed + 1;
        }

        const { __rowid, ...rest } = result;
        return respond({ data: rest });

    } catch (error) {
        return handleApiError(error, "querying deposits locked");
    }
}
