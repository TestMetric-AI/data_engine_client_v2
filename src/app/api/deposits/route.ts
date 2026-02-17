import { NextRequest, NextResponse } from "next/server";
import {
    clearDeposits,
    insertDeposits,
    listDeposits,
    parseDepositsCsv,
    reduceDataByCategory,
    ReductionStats,
} from "@/lib/services/deposits";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "100");

    if (page < 1 || pageSize < 1) {
        return NextResponse.json(
            { message: "Parametros invalidos." },
            { status: 400 }
        );
    }

    // Extract filter parameters
    const getValue = (key: string): string | undefined => {
        const val = searchParams.get(key);
        if (!val) return undefined;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    const filters = {
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

    // Check if any filter is provided
    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    const filtersToPass = hasAnyFilter ? filters : undefined;

    try {
        const offset = (page - 1) * pageSize;
        const { rows, total } = await listDeposits(pageSize, offset, filtersToPass);
        const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

        return NextResponse.json({
            data: rows,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        });
    } catch (error) {
        return handleApiError(error, "listing deposits");
    }
}

export async function POST(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const overwriteRaw = request.nextUrl.searchParams.get("overwrite");
        const overwrite = overwriteRaw === "true" || overwriteRaw === "1";

        // Extract reduction parameters
        const reduceRaw = request.nextUrl.searchParams.get("reduce");
        const shouldReduce = reduceRaw === "true" || reduceRaw === "1";
        const maxPerCategoryRaw = request.nextUrl.searchParams.get("maxPerCategory");
        const maxPerCategory = maxPerCategoryRaw ? Number(maxPerCategoryRaw) : 1000;

        if (!file) {
            return NextResponse.json(
                { message: "Debe enviar un archivo CSV." },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            return NextResponse.json(
                { message: "Nombre de archivo invalido. Se espera un archivo .csv." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const parseResult = parseDepositsCsv(buffer);

        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                {
                    message: "Errores de validacion en el CSV.",
                    errors: parseResult.errors,
                },
                { status: 400 }
            );
        }

        // Apply reduction if requested
        let rowsToInsert = parseResult.rows;
        let reductionStats: ReductionStats | null = null;

        if (shouldReduce) {
            const { reducedRows, stats } = reduceDataByCategory(rowsToInsert, maxPerCategory);
            rowsToInsert = reducedRows;
            reductionStats = stats;
        }

        if (overwrite) {
            await clearDeposits();
        }

        const inserted = await insertDeposits(rowsToInsert);

        const response: any = {
            message: "Archivo cargado correctamente.",
            inserted
        };

        if (reductionStats) {
            response.reduction = {
                applied: true,
                ...reductionStats
            };
        }

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleApiError(error, "uploading deposits");
    }
}
