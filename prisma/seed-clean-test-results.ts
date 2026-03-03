import prisma from "@/lib/db";

const RETENTION_DAYS = 15;

async function main() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const totalBefore = await prisma.testResult.count();
  const oldBefore = await prisma.testResult.count({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  });

  const { count: deleted } = await prisma.testResult.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  });

  const totalAfter = await prisma.testResult.count();

  console.log("TestResults cleanup seed completed");
  console.log(`Retention days: ${RETENTION_DAYS}`);
  console.log(`Cutoff date (older than): ${cutoff.toISOString()}`);
  console.log(`Total before: ${totalBefore}`);
  console.log(`Eligible before: ${oldBefore}`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Total after: ${totalAfter}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("TestResults cleanup seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
