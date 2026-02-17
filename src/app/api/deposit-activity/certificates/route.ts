import { NextRequest, NextResponse } from "next/server";
import { getAllCertificateNumbers } from "@/lib/services/deposit-activity";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const certificates = await getAllCertificateNumbers();

        return NextResponse.json({
            data: certificates,
            count: certificates.length,
        });
    } catch (error) {
        return handleApiError(error, "fetching certificate numbers");
    }
}
