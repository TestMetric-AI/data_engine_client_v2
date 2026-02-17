
import { NextRequest, NextResponse } from "next/server";
import {
    clearClientExonerated,
    insertClientExonerated,
    listClientExonerated,
    parseClientExoneratedXlsx,
} from "@/lib/services/client-exonerated";
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

    try {
        const offset = (page - 1) * pageSize;
        const { rows, total } = await listClientExonerated(pageSize, offset);
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
        return handleApiError(error, "listing client exonerated");
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
                { message: "Debe enviar un archivo XLSX." },
                { status: 400 }
            );
        }

        if (
            !file.name.toLowerCase().endsWith(".xlsx") &&
            file.name !== "clientes_exonerados.xlsx"
        ) {
            // Original logic was strict on name "clientes_exonerados.xlsx"
            // Assuming slightly looser check is fine or strict check:
        }
        // Strict check from logic
        if (file.name.toLowerCase() !== "clientes_exonerados.xlsx") {
            return NextResponse.json({ message: "Nombre de archivo invalido. Se espera clientes_exonerados.xlsx." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const parseResult = await parseClientExoneratedXlsx(buffer);

        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                {
                    message: "Errores de validacion en el XLSX.",
                    errors: parseResult.errors,
                },
                { status: 400 }
            );
        }

        if (overwrite) {
            await clearClientExonerated();
        }

        const inserted = await insertClientExonerated(parseResult.rows);

        return NextResponse.json(
            { message: "Archivo cargado correctamente.", inserted },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error, "uploading client exonerated");
    }
}
