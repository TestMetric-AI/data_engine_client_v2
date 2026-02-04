import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.roles.includes("ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { name, expiresIn } = body;
        // name is for bookkeeping if we were using DB, here just part of payload maybe?
        // expiresIn could be 1y, 30d, etc.

        // Create JWT
        const payload = {
            role: "ADMIN",
            type: "api_token",
            issuedBy: session.user.email,
            name: name || "Generic Token"
        };

        const token = jwt.sign(payload, SECRET, {
            expiresIn: expiresIn || "365d" // Default 1 year
        });

        return NextResponse.json({
            message: "Token generated successfully",
            token
        });

    } catch (error) {
        console.error("Token generation error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
