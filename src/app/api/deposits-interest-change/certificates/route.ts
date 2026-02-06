import { NextRequest, NextResponse } from "next/server";
import { getAllCertificateNumbers } from "@/lib/services/deposits-interest-change";
import { verifyApiAuth } from "@/lib/auth-helper";

export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const certificateNumbers = await getAllCertificateNumbers();

        return NextResponse.json({
            data: certificateNumbers,
            total: certificateNumbers.length,
        });
    } catch (error) {
        console.error("Error fetching certificate numbers:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
