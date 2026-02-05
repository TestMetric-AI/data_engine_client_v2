
import "dotenv/config";
import prisma from "@/lib/db";

async function main() {
    console.log("Checking TESTER role...");

    const roleName = "TESTER";
    const role = await prisma.role.findUnique({
        where: { name: roleName },
        include: { permissions: true }
    });

    if (!role) {
        console.error(`Role ${roleName} not found! Please create it first or check the name.`);
        return;
    }

    console.log(`Found role ${roleName} with permissions:`, role.permissions.map(p => p.name));

    const permissionsToAdd = ["VIEW_MANAGEMENT", "MANAGE_TASKS"];

    // Find permission IDs
    const perms = await prisma.permission.findMany({
        where: { name: { in: permissionsToAdd } }
    });

    if (perms.length !== permissionsToAdd.length) {
        console.error("Some permissions not found in DB:", permissionsToAdd);
    }

    // Update role
    await prisma.role.update({
        where: { id: role.id },
        data: {
            permissions: {
                connect: perms.map(p => ({ id: p.id }))
            }
        }
    });

    console.log(`Updated ${roleName} with permissions:`, perms.map(p => p.name));
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
