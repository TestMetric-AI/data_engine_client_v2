import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth-helper";
import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { handleApiError } from "@/lib/api-error-handler";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { cleanupExpiredTestResults } from "@/lib/services/test-results-retention";

const testResultSchema = z.object({
    testTitle: z.string().min(1),
    testStatus: z.enum(["passed", "failed", "timedOut", "skipped", "interrupted"]),
    duration: z.number().int().nonnegative(),
    testFile: z.string().min(1),
    testProject: z.string().max(100).optional(),
    retries: z.number().int().nonnegative().default(0),
    retry: z.number().int().nonnegative().default(0),
    tags: z.array(z.string()).default([]),
    testInfo: z.record(z.string(), z.unknown()),
    environment: z.string().max(100).optional(),
    pipelineId: z.string().max(255).optional(),
    commitSha: z.string().max(40).optional(),
    branch: z.string().max(255).optional(),
    runUrl: z.string().max(255).optional(),
    provider: z.string().max(50).optional(),
});

const payloadSchema = z.union([
    testResultSchema,
    z.array(testResultSchema).min(1),
]);

export async function POST(request: NextRequest) {
    if (!(await verifyApiAuth(request))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const result = payloadSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { message: "Validation error", errors: result.error.issues },
                { status: 400 },
            );
        }

        const parsed = Array.isArray(result.data) ? result.data : [result.data];

        await cleanupExpiredTestResults();

        const items: Prisma.TestResultCreateManyInput[] = parsed.map((r) => ({
            ...r,
            testInfo: r.testInfo as Prisma.InputJsonValue,
        }));

        const { count } = await prisma.testResult.createMany({
            data: items,
        });

        revalidateTag(CACHE_TAGS.TEST_RESULTS_DASHBOARD, "max");
        revalidateTag(CACHE_TAGS.TEST_INFORMATION, "max");

        return NextResponse.json(
            { message: "Test results saved", count },
            { status: 201 },
        );
    } catch (error) {
        return handleApiError(error, "saving test results");
    }
}
