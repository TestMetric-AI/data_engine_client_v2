import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiAuth } from "@/lib/auth-helper";
import { handleApiError } from "@/lib/api-error-handler";
import { createTestSuites, listTestSuites } from "@/lib/services/test-suites";
import { Permission, requireApi } from "@/lib/rbac";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  testSuiteId: z.string().trim().min(1).optional(),
  specFile: z.string().trim().min(1).optional(),
  testId: z.string().trim().min(1).optional(),
});

const testSuiteSchema = z.object({
  specFile: z.string().trim().min(1),
  testId: z.string().trim().min(1),
  testCaseName: z.string().trim().min(1),
  testCaseTags: z.array(z.string().trim().min(1)).default([]),
});

const payloadSchema = z.union([testSuiteSchema, z.array(testSuiteSchema).min(1)]);

export async function GET(request: NextRequest) {
  if (!(await verifyApiAuth(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = querySchema.safeParse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
      testSuiteId: request.nextUrl.searchParams.get("testSuiteId") ?? undefined,
      specFile: request.nextUrl.searchParams.get("specFile") ?? undefined,
      testId: request.nextUrl.searchParams.get("testId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await listTestSuites(parsed.data);

    return NextResponse.json({
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error, "listing test suites");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApi(Permission.TEST_SUITES_MANAGE);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const { count, skipped } = await createTestSuites(parsed.data);

    return NextResponse.json({ message: "Test suites saved", count, skipped }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "creating test suites");
  }
}






