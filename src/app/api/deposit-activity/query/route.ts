import { NextRequest, NextResponse } from "next/server";
import { findDepositActivityByFilters, markDepositActivityUsedByRowId, DepositActivityQueryFilters } from "@/lib/services/deposit-activity";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: NextRequest) {
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

    const filters: DepositActivityQueryFilters = {
        NUM_CERTIFICADO: getValue("NUM_CERTIFICADO"),
        REFERENCIA: getValue("REFERENCIA"),
        TIPO: getValue("TIPO"),
        ID: getValue("ID"),
        ESTADO: getValue("ESTADO"),
        USUARIO_CREADOR: getValue("USUARIO_CREADOR"),
        USUARIO_APROBADOR: getValue("USUARIO_APROBADOR"),
        FECHA_REGISTRO_DESDE: getValue("FECHA_REGISTRO_DESDE"),
        FECHA_REGISTRO_HASTA: getValue("FECHA_REGISTRO_HASTA"),
        EXISTS: getBooleanValue("EXISTS"),
    };


    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    if (!hasAnyFilter) {
        return NextResponse.json({ message: "Debe enviar al menos un parametro de busqueda." }, { status: 400 });
    }

    // Validate date range if provided
    const hasDateRange = filters.FECHA_REGISTRO_DESDE || filters.FECHA_REGISTRO_HASTA;
    const isDateRangeValid = filters.FECHA_REGISTRO_DESDE && filters.FECHA_REGISTRO_HASTA;

    if (hasDateRange && !isDateRangeValid) {
        return NextResponse.json(
            { message: "FECHA_REGISTRO requiere ambos extremos (DESDE y HASTA)." },
            { status: 400 }
        );
    }

    // Check if user wants to mark record as used (default: true)
    const shouldMarkUsed = getBooleanValue("USED") !== false; // true by default

    try {
        const result = await findDepositActivityByFilters(filters);
        if (!result) {
            return NextResponse.json({ message: "No se encontro ningun resultado." }, { status: 404 });
        }

        // Mark record as used only if USED parameter is not explicitly set to false
        if (shouldMarkUsed) {
            const rowId = result.__rowid;
            if (rowId !== undefined && rowId !== null && typeof rowId === 'number') {
                await markDepositActivityUsedByRowId(rowId);
                const timesUsed = Number(result.TIMES_USED ?? 0);
                result.USED = 1;
                result.TIMES_USED = timesUsed + 1;
            }
        }

        const { __rowid, ...rest } = result;
        return NextResponse.json({ data: rest });

    } catch (error) {
        return handleApiError(error, "querying deposit activity");
    }
}
