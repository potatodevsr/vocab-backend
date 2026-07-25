import bcrypt from "bcryptjs";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin_vocab2026";
  const hash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { username },
    update: { password: hash },
    create: { username, password: hash },
  });

  console.log(`Admin user "${username}" seeded`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());