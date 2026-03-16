-- CreateTable
CREATE TABLE "test_suites" (
    "id" UUID NOT NULL,
    "test_suite_id" TEXT NOT NULL,
    "spec_file" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "test_case_name" TEXT NOT NULL,
    "test_case_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "test_suites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_suites_test_suite_id_idx" ON "test_suites"("test_suite_id");
