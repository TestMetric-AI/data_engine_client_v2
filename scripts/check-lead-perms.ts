
import "dotenv/config";
import prisma from "@/lib/db";

async function main() {
    console.log("Checking LEAD role permissions...");

    const role = await prisma.role.findUnique({
        where: { name: "LEAD" },
        include: { permissions: true }
    });

    if (!role) {
        console.log("Role LEAD not found");
        return;
    }

    console.log("Role:", role.name);
    console.log("Permissions:", role.permissions.map(p => p.name));

    const perm = await prisma.permission.findUnique({
        where: { name: "APPROVE_TASKS" }
    });
    console.log("Permission APPROVE_TASKS exists in DB:", !!perm);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
