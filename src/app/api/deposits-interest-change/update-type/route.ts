import { NextRequest, NextResponse } from "next/server";
import { updateInterestTypeByCertificate } from "@/lib/services/deposits-interest-change";
import { verifyApiAuth } from "@/lib/auth-helper";

export async function PATCH(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { NUM_CERTIFICADO, INTEREST_TYPE } = body;

        if (!NUM_CERTIFICADO || typeof NUM_CERTIFICADO !== "string") {
            return NextResponse.json(
                { message: "NUM_CERTIFICADO es requerido y debe ser un string." },
                { status: 400 }
            );
        }

        if (!INTEREST_TYPE || typeof INTEREST_TYPE !== "string") {
            return NextResponse.json(
                { message: "INTEREST_TYPE es requerido y debe ser un string." },
                { status: 400 }
            );
        }

        const result = await updateInterestTypeByCertificate(
            NUM_CERTIFICADO,
            INTEREST_TYPE
        );

        if (!result.updated) {
            return NextResponse.json(
                { message: "No se encontro el certificado especificado." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "INTEREST_TYPE actualizado correctamente.",
            NUM_CERTIFICADO,
            INTEREST_TYPE,
        });
    } catch (error) {
        console.error("Error updating interest type:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
