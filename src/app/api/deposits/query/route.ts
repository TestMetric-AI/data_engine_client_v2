
import { NextRequest, NextResponse } from "next/server";
import { findDepositByFilters, markDepositUsedByRowId, DepositsQueryFilters } from "@/lib/services/deposits";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const getValue = (key: string): string | undefined => {
        const val = searchParams.get(key);
        if (!val) return undefined;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
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
        return NextResponse.json({ message: "Debe enviar al menos un parametro de busqueda." }, { status: 400 });
    }

    // TODO: Add date validation logic if strict validation is needed
    // logic from express app.ts lines 225-245 can be added here.

    try {
        const result = await findDepositByFilters(filters);
        if (!result) {
            return NextResponse.json({ message: "No se encontro ningun resultado." }, { status: 404 });
        }

        const rowId = result.__rowid;
        if (rowId !== undefined && rowId !== null && typeof rowId === 'number') {
            await markDepositUsedByRowId(rowId);
            const timesUsed = Number(result.TIMES_USED ?? 0);
            result.USED = 1; // SQLite boolean usually 1
            result.TIMES_USED = timesUsed + 1;
        }

        const { __rowid, ...rest } = result;
        return NextResponse.json({ data: rest });

    } catch (error) {
        console.error("Error querying deposits:", error);
        return NextResponse.json({ message: "No se pudo consultar la informacion." }, { status: 500 });
    }
}
