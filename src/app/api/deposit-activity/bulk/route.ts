import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";

export async function PATCH(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
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
                { message: "Nombre de archivo invalido. Se espera un archivo .csv." },
                { status: 400 }
            );
        }

        // Parse CSV file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const csvContent = buffer.toString("utf-8");

        const { parse } = await import("csv-parse/sync");
        let records: Record<string, string>[];

        try {
            records = parse(csvContent, {
                columns: true,
                delimiter: "|",
                skip_empty_lines: true,
                bom: true,
                trim: true,
            });
        } catch (parseError) {
            return NextResponse.json(
                { message: "Error al parsear el archivo CSV.", error: String(parseError) },
                { status: 400 }
            );
        }

        // Validate CSV structure
        if (records.length === 0) {
            return NextResponse.json(
                { message: "El archivo CSV esta vacio." },
                { status: 400 }
            );
        }

        // Check for required columns
        const firstRecord = records[0];
        if (!("NUM_CERTIFICADO" in firstRecord) || !("EXISTS" in firstRecord)) {
            return NextResponse.json(
                {
                    message: "El CSV debe contener las columnas: NUM_CERTIFICADO|EXISTS",
                    receivedColumns: Object.keys(firstRecord),
                },
                { status: 400 }
            );
        }

        // Validate and transform records
        const validationErrors: Array<{ row: number; field: string; value: string; message: string }> = [];
        const updates: Array<{ NUM_CERTIFICADO: string; EXISTS: boolean }> = [];

        records.forEach((record, index) => {
            const rowNumber = index + 2; // +2 for header and 0-based index
            const numCertificado = record.NUM_CERTIFICADO?.trim();
            const existsRaw = record.EXISTS?.trim().toUpperCase();

            // Validate NUM_CERTIFICADO
            if (!numCertificado || numCertificado.length === 0) {
                validationErrors.push({
                    row: rowNumber,
                    field: "NUM_CERTIFICADO",
                    value: numCertificado || "",
                    message: "NUM_CERTIFICADO es requerido y no puede estar vacio.",
                });
                return;
            }

            // Validate and convert EXISTS
            let exists: boolean;
            if (existsRaw === "TRUE" || existsRaw === "1" || existsRaw === "SI") {
                exists = true;
            } else if (existsRaw === "FALSE" || existsRaw === "0" || existsRaw === "NO") {
                exists = false;
            } else {
                validationErrors.push({
                    row: rowNumber,
                    field: "EXISTS",
                    value: existsRaw || "",
                    message: "EXISTS debe ser: true/false, 1/0, o SI/NO.",
                });
                return;
            }

            updates.push({ NUM_CERTIFICADO: numCertificado, EXISTS: exists });
        });

        // Return validation errors if any
        if (validationErrors.length > 0) {
            return NextResponse.json(
                {
                    message: "Errores de validacion en el CSV.",
                    errors: validationErrors,
                },
                { status: 400 }
            );
        }

        // Perform bulk update
        const { bulkUpdateDepositActivityExists } = await import("@/lib/services/deposit-activity");
        const result = await bulkUpdateDepositActivityExists(updates);

        // Determine response message
        let message = "Actualizacion masiva completada.";
        if (result.notFound.length > 0 || result.errors.length > 0) {
            message = "Actualizacion masiva completada con algunos errores.";
        }

        return NextResponse.json({
            message,
            updated: result.updated,
            notFound: result.notFound,
            errors: result.errors,
            total: updates.length,
        });
    } catch (error) {
        return handleApiError(error, "bulk updating deposit activity");
    }
}
