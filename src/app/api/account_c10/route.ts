import { NextRequest, NextResponse } from "next/server";
import { listAccountC10 } from "@/lib/services/account-c10";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";

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

    // Extract filter parameters
    const getValue = (key: string): string | undefined => {
        const val = searchParams.get(key);
        if (!val) return undefined;
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };

    const filters: Record<string, string | undefined> = {
        arrangement_id: getValue("arrangement_id"),
        company_code: getValue("company_code"),
        arrangement_status: getValue("arrangement_status"),
        product_id: getValue("product_id"),
        product_group_id: getValue("product_group_id"),
        account_id: getValue("account_id"),
        officer_name: getValue("officer_name"),
        currency: getValue("currency"),
        legal_doc_name: getValue("legal_doc_name"),
        legal_id: getValue("legal_id"),
        officer_id: getValue("officer_id"),
    };

    // Remove undefined
    const cleanFilters: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
            cleanFilters[key] = value;
        }
    }

    const hasAnyFilter = Object.keys(cleanFilters).length > 0;
    const filtersToPass = hasAnyFilter ? cleanFilters : undefined;

    try {
        const offset = (page - 1) * pageSize;
        const { rows, total } = await listAccountC10(pageSize, offset, filtersToPass);
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
        return handleApiError(error, "listing account_c10");
    }
}
