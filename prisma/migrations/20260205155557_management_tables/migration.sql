-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_task_statuses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#607d8b',
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_task_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role_id" UUID,
    "allocation_percentage" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_tasks" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "project_id" UUID,
    "status_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "due_date" DATE,
    "estimated_hours" DECIMAL(6,2),
    "actual_hours" DECIMAL(6,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "resource_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_notes" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "author_id" UUID,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_task_status_history" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "from_status_id" UUID,
    "to_status_id" UUID NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "resource_task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "resource_roles_name_key" ON "resource_roles"("name");

-- CreateIndex
CREATE INDEX "resource_roles_created_at_idx" ON "resource_roles"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "resource_task_statuses_code_key" ON "resource_task_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "resource_task_statuses_order_index_key" ON "resource_task_statuses"("order_index");

-- CreateIndex
CREATE INDEX "resource_task_statuses_created_at_idx" ON "resource_task_statuses"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "resources_user_id_key" ON "resources"("user_id");

-- CreateIndex
CREATE INDEX "resources_active_idx" ON "resources"("active");

-- CreateIndex
CREATE INDEX "resources_role_id_idx" ON "resources"("role_id");

-- CreateIndex
CREATE INDEX "resources_created_at_idx" ON "resources"("created_at" DESC);

-- CreateIndex
CREATE INDEX "resource_tasks_status_id_idx" ON "resource_tasks"("status_id");

-- CreateIndex
CREATE INDEX "resource_tasks_resource_id_idx" ON "resource_tasks"("resource_id");

-- CreateIndex
CREATE INDEX "resource_tasks_project_id_idx" ON "resource_tasks"("project_id");

-- CreateIndex
CREATE INDEX "resource_tasks_due_date_idx" ON "resource_tasks"("due_date");

-- CreateIndex
CREATE INDEX "resource_tasks_priority_idx" ON "resource_tasks"("priority");

-- CreateIndex
CREATE INDEX "resource_tasks_updated_at_idx" ON "resource_tasks"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "resource_tasks_project_id_status_id_idx" ON "resource_tasks"("project_id", "status_id");

-- CreateIndex
CREATE INDEX "resource_tasks_resource_id_status_id_idx" ON "resource_tasks"("resource_id", "status_id");

-- CreateIndex
CREATE INDEX "resource_notes_resource_id_idx" ON "resource_notes"("resource_id");

-- CreateIndex
CREATE INDEX "resource_notes_author_id_idx" ON "resource_notes"("author_id");

-- CreateIndex
CREATE INDEX "resource_notes_created_at_idx" ON "resource_notes"("created_at" DESC);

-- CreateIndex
CREATE INDEX "resource_task_status_history_task_id_changed_at_idx" ON "resource_task_status_history"("task_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "resource_task_status_history_changed_by_changed_at_idx" ON "resource_task_status_history"("changed_by", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "resource_task_status_history_to_status_id_changed_at_idx" ON "resource_task_status_history"("to_status_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "Permission_isActive_idx" ON "Permission"("isActive");

-- CreateIndex
CREATE INDEX "Permission_createdAt_idx" ON "Permission"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Role_isActive_idx" ON "Role"("isActive");

-- CreateIndex
CREATE INDEX "Role_createdAt_idx" ON "Role"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "resource_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tasks" ADD CONSTRAINT "resource_tasks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tasks" ADD CONSTRAINT "resource_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tasks" ADD CONSTRAINT "resource_tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "resource_task_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_task_status_history" ADD CONSTRAINT "resource_task_status_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "resource_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_task_status_history" ADD CONSTRAINT "resource_task_status_history_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "resource_task_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_task_status_history" ADD CONSTRAINT "resource_task_status_history_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "resource_task_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_task_status_history" ADD CONSTRAINT "resource_task_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
