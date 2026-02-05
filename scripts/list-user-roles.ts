
import "dotenv/config";
import prisma from "@/lib/db";

async function main() {
    console.log("Listing User Roles:");
    const roles = await prisma.role.findMany({
        include: { permissions: true }
    });
    roles.forEach(r => {
        console.log(`- ${r.name}: [${r.permissions.map(p => p.name).join(", ")}]`);
    });
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
