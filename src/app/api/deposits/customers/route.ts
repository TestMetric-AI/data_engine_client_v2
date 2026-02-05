import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import { getDistinctCustomers } from "@/lib/services/deposits";

export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const customers = await getDistinctCustomers();
        return NextResponse.json({ customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        return NextResponse.json(
            { message: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
