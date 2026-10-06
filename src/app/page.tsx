import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateAvailableTickets } from "@/lib/inventory";
import { EventCatalogBrowser, CatalogEvent } from "@/components/event-catalog-browser";
import { PublicNavbar } from "@/components/public-navbar";

async function getPublishedEvents(): Promise<{ events: CatalogEvent[] | null; error: boolean }> {
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        imageUrl: true,
        eventDate: true,
        startTime: true,
        venue: true,
        ticketPrice: true,
        totalTickets: true,
      },
    });

    const now = new Date();
    const list: CatalogEvent[] = [];
    for (const e of events) {
      const availableQuantity = await calculateAvailableTickets(e.id, e.totalTickets, now);
      list.push({
        id: e.id,
        name: e.name,
        category: e.category || "Concert",
        description: e.description,
        imageUrl: e.imageUrl,
        eventDate: e.eventDate.toISOString().split("T")[0],
        startTime: e.startTime,
        venue: e.venue,
        ticketPrice: e.ticketPrice.toFixed(2),
        availableQuantity,
      });
    }

    return { events: list, error: false };
  } catch (err) {
    console.error("Failed to get published events:", err);
    return { events: null, error: true };
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { events, error } = await getPublishedEvents();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <PublicNavbar />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full space-y-10">
        {/* Intro */}
        <section className="space-y-3 max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            LOCAL CONCERTS / BANGKOK
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            ค่ำคืนถัดไป<br />เริ่มที่นี่
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
            ค้นพบดนตรีสดใกล้คุณ เลือกงาน ซื้อบัตร และรับ QR Code เข้างานได้ทันทีโดยไม่ต้องสมัครสมาชิก
          </p>
        </section>

        {/* Error State */}
        {error && (
          <div className="p-8 border border-neutral-800 bg-neutral-950 rounded-lg text-center space-y-3">
            <p className="text-red-400 font-medium">ไม่สามารถโหลดข้อมูลงานแสดงได้ในขณะนี้</p>
            <p className="text-xs text-neutral-500">กรุณาลองรีเฟรชหน้าเว็บใหม่อีกครั้ง</p>
          </div>
        )}

        {/* Empty State */}
        {!error && events && events.length === 0 && (
          <div className="p-12 border border-dashed border-neutral-800 bg-neutral-950/50 rounded-lg text-center space-y-2">
            <p className="text-neutral-300 font-medium">ยังไม่มีงานแสดงที่เปิดจำหน่ายในขณะนี้</p>
            <p className="text-xs text-neutral-500">โปรดติดตามรอบการจำหน่ายบัตรคอนเสิร์ตเร็วๆ นี้</p>
          </div>
        )}

        {/* Interactive Browser with Banner, Search, and Category Filter */}
        {!error && events && events.length > 0 && (
          <EventCatalogBrowser events={events} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600 space-y-2">
        <p>E-Tikket Ticketing Platform • MVP</p>
        <p>
          <Link
            href="/login"
            className="text-neutral-700 hover:text-neutral-400 text-[11px] transition-colors"
          >
            เจ้าหน้าที่ / ผู้จัดงานเข้าสู่ระบบ
          </Link>
        </p>
      </footer>
    </div>
  );
}
