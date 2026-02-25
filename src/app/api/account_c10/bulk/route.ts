import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";
import { parseAccountC10Csv, insertAccountC10Batch } from "@/lib/services/account-c10";

export async function POST(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json(
                {
                    message:
                        'Content-Type debe ser "multipart/form-data". ' +
                        "Si usa curl, asegúrese de no usar --location (puede perder el body en redirects). " +
                        "Use --form para enviar el archivo.",
                },
                { status: 400 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { message: "Debe enviar un archivo CSV." },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith(".csv")) {
            return NextResponse.json(
                { message: "Nombre de archivo inválido. Se espera un archivo .csv." },
                { status: 400 }
            );
        }

        // Validate file size, max 10MB approx to prevent memory issues for synchronous parsing
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { message: "El archivo es demasiado grande. El máximo permitido es 10MB." },
                { status: 400 }
            );
        }

        // Parse CSV file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { rows, errors } = parseAccountC10Csv(buffer);

        // Return all validation errors so the user can fix them at once
        if (errors.length > 0) {
            return NextResponse.json(
                {
                    message: "Errores de validación en el CSV. No se realizó ninguna carga.",
                    errors,
                },
                { status: 400 }
            );
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { message: "El archivo CSV está vacío o no contiene registros válidos." },
                { status: 400 }
            );
        }

        const insertedCount = await insertAccountC10Batch(rows);

        return NextResponse.json({
            message: "Carga masiva completada exitosamente.",
            inserted: insertedCount,
        });

    } catch (error) {
        return handleApiError(error, "bulk uploading account_c10");
    }
}
