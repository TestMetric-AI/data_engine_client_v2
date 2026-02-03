import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL as string;
const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASSWORD;

    if (!email || !password) {
        console.error("Error: USER_EMAIL or USER_PASSWORD not found in .env");
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Upsert Admin Role
    const adminRole = await prisma.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: {
            name: "ADMIN",
            description: "Administrator with full access",
        },
    });
    console.log({ adminRole });

    // Upsert Admin User
    const adminUser = await prisma.user.upsert({
        where: { email },
        update: {
            roles: {
                connect: { id: adminRole.id }
            }
        },
        create: {
            email,
            name: "Admin User",
            password: hashedPassword,
            roles: {
                connect: { id: adminRole.id },
            },
        },
    });

    console.log({ adminUser });
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
