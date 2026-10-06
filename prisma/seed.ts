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
  if (password.length < 8) {
    throw new Error(`SEED_${prefix}_PASSWORD must contain at least 8 characters`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`SEED_${prefix}_EMAIL must be a valid email address`);
  }
  return { email, name, password, role: prefix as Role };
}

async function seedStaffAccount(prefix: "ADMIN" | "ORGANIZER") {
  const account = staffConfig(prefix);
  const passwordHash = await bcrypt.hash(account.password, BCRYPT_COST);

  return prisma.user.upsert({
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

async function seedCleanSampleEvents(organizerId: string) {
  // Clean up existing test data
  await prisma.ticketScan.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.event.deleteMany({});

  const sampleEvents = [
    {
      name: "Summer Live Concert 2026",
      category: "Indie Pop",
      description: "คอนเสิร์ตอินดี้รับลมริมแม่น้ำเจ้าพระยา รวมศิลปินอินดี้ป็อปแถวหน้า พร้อมระบบเสียงคุณภาพระดับสตูดิโอ",
      imageUrl: "/poster-summer.svg",
      venue: "The Riverfront Warehouse (เจริญกรุง)",
      eventDate: new Date("2026-10-24"),
      startTime: "18:00",
      ticketPrice: 450.00,
      totalTickets: 100,
      status: "PUBLISHED" as const,
    },
    {
      name: "Neon Indie Rock Fest",
      category: "Rock",
      description: "ค่ำคืนแห่งเสียงกีตาร์ริฟฟ์หนักแน่น แสงไฟนีออน และดนตรี Indie Rock / Post-Punk แบบสดๆ เต็มอิ่ม",
      imageUrl: "/poster-indie.svg",
      venue: "The Underground Club (เอกมัย)",
      eventDate: new Date("2026-11-15"),
      startTime: "19:30",
      ticketPrice: 650.00,
      totalTickets: 120,
      status: "PUBLISHED" as const,
    },
    {
      name: "Acoustic in the Garden",
      category: "Acoustic",
      description: "ดนตรีโฟล์คและอคูสติกท่ามกลางสวนธรรมชาติ บรรยากาศสบายๆ ยามเย็น เหมาะสำหรับการพักผ่อนฟังเพลงชิลๆ",
      imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80",
      venue: "Saranrom Garden Live Stage (พระนคร)",
      eventDate: new Date("2026-12-19"),
      startTime: "17:00",
      ticketPrice: 250.00,
      totalTickets: 80,
      status: "PUBLISHED" as const,
    },
    {
      name: "Midnight Electronic Wave",
      category: "EDM",
      description: "ปาร์ตี้ส่งท้ายปีเก่าต้อนรับปีใหม่กับดนตรี Electronic, Synthwave และ Bassline สั่นสะเทือนเวที",
      imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
      venue: "Space BKK Arena (รัชดา)",
      eventDate: new Date("2026-12-31"),
      startTime: "21:00",
      ticketPrice: 890.00,
      totalTickets: 200,
      status: "PUBLISHED" as const,
    },
  ];

  for (const eventData of sampleEvents) {
    await prisma.event.create({
      data: {
        ...eventData,
        organizerId,
      },
    });
  }
}

async function main() {
  const admin = staffConfig("ADMIN");
  const organizer = staffConfig("ORGANIZER");
  if (admin.email === organizer.email) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ORGANIZER_EMAIL must be different");
  }
  await seedStaffAccount("ADMIN");
  const organizerUser = await seedStaffAccount("ORGANIZER");
  console.info("Seeded configured ADMIN and ORGANIZER accounts.");

  await seedCleanSampleEvents(organizerUser.id);
  console.info("Seeded clean 4 sample published events with categories.");
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
