/**
 * seed-backup.ts
 * ──────────────────────────────────────────────
 * Manual database backup script.
 *
 * Exports every table defined in the Prisma schema to JSON files
 * and stores them under  prisma/backups/<timestamp>/
 *
 * Usage:
 *   pnpm db:backup
 *   # or directly:
 *   node --env-file=.env --import tsx prisma/seed-backup.ts
 */

import prisma from "@/lib/db";
import fs from "fs";
import path from "path";

// ── helpers ─────────────────────────────────────────────────────
function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

async function writeJSON(dir: string, name: string, data: unknown) {
  const filePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  const count = Array.isArray(data) ? data.length : 0;
  console.log(`  ✔ ${name}.json  (${count} records)`);
}

// ── main ────────────────────────────────────────────────────────
async function main() {
  const backupDir = path.resolve(__dirname, "backups", timestamp());
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`\n🗄️  Starting database backup…`);
  console.log(`   Destination: ${backupDir}\n`);

  // ── Auth / RBAC ──
  const users = await prisma.user.findMany({
    include: { roles: { select: { id: true, name: true } } },
  });
  await writeJSON(backupDir, "users", users);

  const roles = await prisma.role.findMany({
    include: { permissions: { select: { id: true, name: true } } },
  });
  await writeJSON(backupDir, "roles", roles);

  const permissions = await prisma.permission.findMany();
  await writeJSON(backupDir, "permissions", permissions);

  // ── Resource Management ──
  const projects = await prisma.project.findMany();
  await writeJSON(backupDir, "projects", projects);

  const resourceRoles = await prisma.resourceRole.findMany();
  await writeJSON(backupDir, "resource_roles", resourceRoles);

  const resourceTaskStatuses = await prisma.resourceTaskStatus.findMany();
  await writeJSON(backupDir, "resource_task_statuses", resourceTaskStatuses);

  const resources = await prisma.resource.findMany();
  await writeJSON(backupDir, "resources", resources);

  const resourceTasks = await prisma.resourceTask.findMany();
  await writeJSON(backupDir, "resource_tasks", resourceTasks);

  const resourceNotes = await prisma.resourceNote.findMany();
  await writeJSON(backupDir, "resource_notes", resourceNotes);

  const statusHistory = await prisma.resourceTaskStatusHistory.findMany();
  await writeJSON(backupDir, "resource_task_status_history", statusHistory);

  const dailies = await prisma.resourceTaskDaily.findMany();
  await writeJSON(backupDir, "resource_task_dailies", dailies);

  // ── Test Results ──
  const testResults = await prisma.testResult.findMany();
  await writeJSON(backupDir, "test_results", testResults);

  // ── Metadata file ──
  const meta = {
    createdAt: new Date().toISOString(),
    tables: {
      users: users.length,
      roles: roles.length,
      permissions: permissions.length,
      projects: projects.length,
      resource_roles: resourceRoles.length,
      resource_task_statuses: resourceTaskStatuses.length,
      resources: resources.length,
      resource_tasks: resourceTasks.length,
      resource_notes: resourceNotes.length,
      resource_task_status_history: statusHistory.length,
      resource_task_dailies: dailies.length,
      test_results: testResults.length,
    },
    totalRecords: [
      users, roles, permissions, projects, resourceRoles,
      resourceTaskStatuses, resources, resourceTasks,
      resourceNotes, statusHistory, dailies, testResults,
    ].reduce((sum, arr) => sum + arr.length, 0),
  };
  await writeJSON(backupDir, "_metadata", meta);

  console.log(`\n✅  Backup complete — ${meta.totalRecords} total records exported.`);
  console.log(`   Path: ${backupDir}\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌  Backup failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
