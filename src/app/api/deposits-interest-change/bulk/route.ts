import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";

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
        if (!("NUM_CERTIFICADO" in firstRecord) || !("INTEREST_TYPE" in firstRecord)) {
            return NextResponse.json(
                {
                    message: "El CSV debe contener las columnas: NUM_CERTIFICADO|INTEREST_TYPE",
                    receivedColumns: Object.keys(firstRecord),
                },
                { status: 400 }
            );
        }

        // Validate and transform records
        const validationErrors: Array<{ row: number; field: string; value: string; message: string }> = [];
        const updates: Array<{ NUM_CERTIFICADO: string; INTEREST_TYPE: string }> = [];

        records.forEach((record, index) => {
            const rowNumber = index + 2; // +2 for header and 0-based index
            const numCertificado = record.NUM_CERTIFICADO?.trim();
            const interestType = record.INTEREST_TYPE?.trim();

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

            // Validate INTEREST_TYPE
            if (!interestType || interestType.length === 0) {
                validationErrors.push({
                    row: rowNumber,
                    field: "INTEREST_TYPE",
                    value: interestType || "",
                    message: "INTEREST_TYPE es requerido y no puede estar vacio.",
                });
                return;
            }

            updates.push({ NUM_CERTIFICADO: numCertificado, INTEREST_TYPE: interestType });
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
        const { bulkUpdateInterestTypeByCertificate } = await import("@/lib/services/deposits-interest-change");
        const result = await bulkUpdateInterestTypeByCertificate(updates);

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
        console.error("Error in bulk update:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
