import { NextRequest, NextResponse } from "next/server";
import { findInterestChangeByFilters, DepositsInterestChangeQueryFilters } from "@/lib/services/deposits-interest-change";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const getValue = (key: string): string | undefined => {
        const val = searchParams.get(key);
        if (!val) return undefined;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    const filters: DepositsInterestChangeQueryFilters = {
        NUM_CERTIFICADO: getValue("NUM_CERTIFICADO"),
        INTEREST_TYPE: getValue("INTEREST_TYPE"),
        FECHA_CAMBIO_TASA_DESDE: getValue("FECHA_CAMBIO_TASA_DESDE"),
        FECHA_CAMBIO_TASA_HASTA: getValue("FECHA_CAMBIO_TASA_HASTA"),
    };

    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    if (!hasAnyFilter) {
        return NextResponse.json(
            { message: "Debe enviar al menos un parametro de busqueda." },
            { status: 400 }
        );
    }

    // Validate date range - both dates required if one is provided
    const hasDateFrom = filters.FECHA_CAMBIO_TASA_DESDE !== undefined;
    const hasDateTo = filters.FECHA_CAMBIO_TASA_HASTA !== undefined;
    if (hasDateFrom !== hasDateTo) {
        return NextResponse.json(
            { message: "El rango de fechas requiere ambos parametros: FECHA_CAMBIO_TASA_DESDE y FECHA_CAMBIO_TASA_HASTA." },
            { status: 400 }
        );
    }

    try {
        const result = await findInterestChangeByFilters(filters);
        if (!result) {
            return NextResponse.json(
                { message: "No se encontro ningun resultado." },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: result });
    } catch (error) {
        return handleApiError(error, "querying interest-change");
    }
}
