import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sessionLogger } from "@/lib/session-logger";

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
        console.error("Error extending session:", error);
        return NextResponse.json(
            { error: "Failed to extend session" },
            { status: 500 }
        );
    }
}
