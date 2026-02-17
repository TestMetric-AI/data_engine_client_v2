import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { handleApiError } from "@/lib/api-error-handler";

const profileSchema = z.object({
    name: z.string().min(2),
    password: z.string().optional().or(z.literal("")),
});

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const result = profileSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 400 });
        }

        const { name, password } = result.data;
        const userId = session.user.id; // Corrected to use ID

        const updateData: any = { name };

        if (password && password.length >= 6) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return NextResponse.json({ message: "Profile updated successfully" });
    } catch (error) {
        return handleApiError(error, "updating profile");
    }
}
