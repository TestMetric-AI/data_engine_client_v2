import { NextRequest, NextResponse } from "next/server";
import {
    clearDepositsInterestChange,
    insertDepositsInterestChange,
    listDepositsInterestChange,
    parseDepositsInterestChangeCsv,
} from "@/lib/services/deposits-interest-change";
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
        NUM_CERTIFICADO: getValue("NUM_CERTIFICADO"),
        USUARIO_CAMBIO_TASA: getValue("USUARIO_CAMBIO_TASA"),
        INTEREST_TYPE: getValue("INTEREST_TYPE"),
        FECHA_CAMBIO_TASA_DESDE: getValue("FECHA_CAMBIO_TASA_DESDE"),
        FECHA_CAMBIO_TASA_HASTA: getValue("FECHA_CAMBIO_TASA_HASTA"),
    };

    // Check if any filter is provided
    const hasAnyFilter = Object.values(filters).some((v) => v !== undefined);
    const filtersToPass = hasAnyFilter ? filters : undefined;

    try {
        const offset = (page - 1) * pageSize;
        const { rows, total } = await listDepositsInterestChange(pageSize, offset, filtersToPass);
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
        return handleApiError(error, "listing interest-change");
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
        const parseResult = parseDepositsInterestChangeCsv(buffer);

        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                {
                    message: "Errores de validacion en el CSV.",
                    errors: parseResult.errors,
                },
                { status: 400 }
            );
        }

        if (overwrite) {
            await clearDepositsInterestChange();
        }

        const inserted = await insertDepositsInterestChange(parseResult.rows);

        return NextResponse.json(
            { message: "Archivo cargado correctamente.", inserted },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, "uploading interest-change");
    }
}
