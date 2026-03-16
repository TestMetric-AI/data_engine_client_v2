import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-error-handler";
import { deleteTestSuiteById, updateTestSuiteById } from "@/lib/services/test-suites";
import { Permission, requireApi } from "@/lib/rbac";

const idSchema = z.object({
  id: z.string().uuid(),
});

const updatePayloadSchema = z
  .object({
    testSuiteId: z.string().trim().min(1).optional(),
    specFile: z.string().trim().min(1).optional(),
    testId: z.string().trim().min(1).optional(),
    testCaseName: z.string().trim().min(1).optional(),
    testCaseTags: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

function isTestSuiteNotFoundError(error: unknown): error is Error {
  return error instanceof Error && error.name === "TestSuiteNotFoundError";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApi(Permission.TEST_SUITES_MANAGE);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const routeParams = await params;
    const parsedId = idSchema.safeParse(routeParams);

    if (!parsedId.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsedId.error.issues },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsedBody = updatePayloadSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const updated = await updateTestSuiteById(parsedId.data.id, parsedBody.data);
    return NextResponse.json(updated);
  } catch (error) {
    if (isTestSuiteNotFoundError(error)) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return handleApiError(error, "updating test suite");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApi(Permission.TEST_SUITES_MANAGE);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const routeParams = await params;
    const parsedId = idSchema.safeParse(routeParams);

    if (!parsedId.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsedId.error.issues },
        { status: 400 }
      );
    }

    await deleteTestSuiteById(parsedId.data.id);
    return NextResponse.json({ message: "TestSuite deleted" });
  } catch (error) {
    if (isTestSuiteNotFoundError(error)) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return handleApiError(error, "deleting test suite");
  }
}
