import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import {
    parseDepositsTrxLogCSV,
    clearDepositsTrxLogTable,
    insertDepositsTrxLogBatch,
    listDepositsTrxLog,
    getDepositsTrxLogCount,
} from "@/lib/services/deposits-trxlog";

/**
 * GET /api/deposits-trxlog
 * List deposits_trxlog records with pagination and search
 */
export async function GET(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || undefined;

    if (page < 1 || limit < 1 || limit > 1000) {
        return NextResponse.json(
            { message: "Invalid pagination parameters" },
            { status: 400 }
        );
    }

    try {
        const offset = (page - 1) * limit;
        const result = await listDepositsTrxLog(limit, offset, search);

        return NextResponse.json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
            },
        });
    } catch (error) {
        console.error("Error listing deposits_trxlog:", error);
        return NextResponse.json(
            { message: "Failed to retrieve data" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/deposits-trxlog
 * Upload CSV file and insert data
 */
export async function POST(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const mode = formData.get("mode") as string | null;

        if (!file) {
            return NextResponse.json({ message: "No file provided" }, { status: 400 });
        }

        if (!mode || !["APPEND", "REPLACE"].includes(mode)) {
            return NextResponse.json(
                { message: "Invalid mode. Must be APPEND or REPLACE" },
                { status: 400 }
            );
        }

        // Read file content
        const content = await file.text();

        // Parse CSV
        let records: Record<string, string>[];
        try {
            records = parseDepositsTrxLogCSV(content);
        } catch (error: any) {
            return NextResponse.json(
                { message: `CSV parsing error: ${error.message}` },
                { status: 400 }
            );
        }

        // Clear table if REPLACE mode
        if (mode === "REPLACE") {
            await clearDepositsTrxLogTable();
        }

        // Insert records
        await insertDepositsTrxLogBatch(records);

        // Get final count
        const totalCount = await getDepositsTrxLogCount();

        return NextResponse.json({
            message: "Upload successful",
            recordsProcessed: records.length,
            totalRecords: totalCount,
            mode,
        });
    } catch (error: any) {
        console.error("Error uploading deposits_trxlog:", error);
        return NextResponse.json(
            { message: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}
