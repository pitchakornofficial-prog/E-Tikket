import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required seed configuration: ${name}`);
  return value;
}

function staffConfig(prefix: "ADMIN" | "ORGANIZER") {
  const email = requiredEnv(`SEED_${prefix}_EMAIL`).toLowerCase();
  const name = requiredEnv(`SEED_${prefix}_NAME`);
  const password = requiredEnv(`SEED_${prefix}_PASSWORD`);
  if (password.length < 12) {
    throw new Error(`SEED_${prefix}_PASSWORD must contain at least 12 characters`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`SEED_${prefix}_EMAIL must be a valid email address`);
  }
  return { email, name, password, role: prefix as Role };
}

async function seedStaffAccount(prefix: "ADMIN" | "ORGANIZER") {
  const account = staffConfig(prefix);
  const passwordHash = await bcrypt.hash(account.password, BCRYPT_COST);

  await prisma.user.upsert({
    where: { email: account.email },
    create: {
      email: account.email,
      name: account.name,
      passwordHash,
      role: account.role,
    },
    update: {
      name: account.name,
      passwordHash,
      role: account.role,
    },
  });
}

async function main() {
  const admin = staffConfig("ADMIN");
  const organizer = staffConfig("ORGANIZER");
  if (admin.email === organizer.email) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ORGANIZER_EMAIL must be different");
  }
  await seedStaffAccount("ADMIN");
  await seedStaffAccount("ORGANIZER");
  console.info("Seeded configured ADMIN and ORGANIZER accounts.");
}

main()
  .catch((error: unknown) => {
    console.error("Staff account seeding failed.");
    if (error instanceof Error && error.message.startsWith("Missing required seed configuration:")) {
      console.error(error.message);
    } else if (error instanceof Error && error.message.startsWith("SEED_")) {
      console.error(error.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
