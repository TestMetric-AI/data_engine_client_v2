-- AlterTable
ALTER TABLE "resource_roles" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "resource_roles_isActive_idx" ON "resource_roles"("isActive");
