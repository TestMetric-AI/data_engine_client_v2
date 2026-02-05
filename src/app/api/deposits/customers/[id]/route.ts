import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import { updateCustomerLegalInfo } from "@/lib/services/deposits";
import { z } from "zod";

const updateSchema = z.object({
    legalId: z.string().min(1, "El LEGAL_ID es requerido"),
    legalDoc: z.string().min(1, "El LEGAL_DOC es requerido"),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const validation = updateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    message: "Datos invalidos",
                    errors: validation.error.issues,
                },
                { status: 400 }
            );
        }

        const { legalId, legalDoc } = validation.data;
        const updatedCount = await updateCustomerLegalInfo(id, legalId, legalDoc);

        return NextResponse.json({
            message: "Informacion actualizada correctamente.",
            updatedCount,
        });
    } catch (error) {
        console.error("Error updating customer:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
