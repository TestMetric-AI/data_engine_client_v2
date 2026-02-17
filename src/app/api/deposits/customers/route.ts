import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import { getDistinctCustomers } from "@/lib/services/deposits";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const customers = await getDistinctCustomers();
        return NextResponse.json({ customers });
    } catch (error) {
        return handleApiError(error, "fetching customers");
    }
}
