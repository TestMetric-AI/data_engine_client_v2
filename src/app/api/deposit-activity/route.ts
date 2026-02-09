import { NextRequest, NextResponse } from "next/server";
import {
    clearDepositActivity,
    insertDepositActivity,
    listDepositActivity,
    parseDepositActivityCsv,
    DepositActivityListFilters,
} from "@/lib/services/deposit-activity";
import { verifyApiAuth } from "@/lib/auth-helper";

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

    // Extract filters
    const filters: DepositActivityListFilters = {};
    const numCertificado = searchParams.get("NUM_CERTIFICADO");
    const estado = searchParams.get("ESTADO");
    const id = searchParams.get("ID");

    if (numCertificado) filters.NUM_CERTIFICADO = numCertificado;
    if (estado) filters.ESTADO = estado;
    if (id) filters.ID = id;

    try {
        const offset = (page - 1) * pageSize;
        const { rows, total } = await listDepositActivity(
            pageSize,
            offset,
            Object.keys(filters).length > 0 ? filters : undefined
        );
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
        console.error("Error listing deposit activity:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { NUM_CERTIFICADO, EXISTS } = body;

        if (!NUM_CERTIFICADO) {
            return NextResponse.json(
                { message: "NUM_CERTIFICADO es requerido." },
                { status: 400 }
            );
        }

        if (typeof EXISTS !== "boolean") {
            return NextResponse.json(
                { message: "EXISTS debe ser un valor booleano (true/false)." },
                { status: 400 }
            );
        }

        const { updateDepositActivityExists } = await import("@/lib/services/deposit-activity");
        const result = await updateDepositActivityExists(NUM_CERTIFICADO, EXISTS);

        if (result.updated === 0) {
            return NextResponse.json(
                { message: "No se encontro ningun registro con ese NUM_CERTIFICADO." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "EXISTS actualizado correctamente.",
            updated: result.updated,
        });
    } catch (error) {
        console.error("Error updating deposit activity EXISTS:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
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
        const parseResult = parseDepositActivityCsv(buffer);

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
            await clearDepositActivity();
        }

        const inserted = await insertDepositActivity(parseResult.rows);

        return NextResponse.json(
            { message: "Archivo cargado correctamente.", inserted },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error uploading deposit activity:", error);
        return NextResponse.json(
            { message: "No se pudo procesar el archivo." },
            { status: 500 }
        );
    }
}
