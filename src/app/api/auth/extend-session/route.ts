import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sessionLogger } from "@/lib/session-logger";
import { handleApiError } from "@/lib/api-error-handler";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Log session extension
        sessionLogger.logSessionExtended(
            session.user.id,
            session.user.email || "",
            "user_action"
        );

        return NextResponse.json({
            success: true,
            message: "Session extended successfully",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return handleApiError(error, "extending session");
    }
}
