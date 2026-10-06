import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateAvailableTickets } from "@/lib/inventory";
import { TicketPurchaseForm } from "@/components/ticket-purchase-form";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CheckIcon,
  ArrowLeftIcon,
} from "@/components/icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  let event = null;
  try {
    event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { name: true },
        },
      },
    });
  } catch {
    // Database connection failure
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 border border-neutral-800 bg-neutral-950 rounded-lg text-center space-y-4">
          <h1 className="text-xl font-bold text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</h1>
          <p className="text-sm text-neutral-400">ระบบไม่สามารถโหลดข้อมูลงานแสดงได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-800 text-white text-sm rounded hover:bg-neutral-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" /> กลับสู่หน้ารวมงานแสดง
          </Link>
        </div>
      </div>
    );
  }

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  const availableQuantity = await calculateAvailableTickets(
    event.id,
    event.totalTickets,
    new Date(),
  );

  const isSoldOut = availableQuantity <= 0;
  const formattedDate = event.eventDate.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold tracking-wider text-lg uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">MVP</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>ย้อนกลับไปหน้ารวมงาน</span>
            </Link>
            <Link
              href="/my-tickets"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              ตั๋วของฉัน
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Artwork & Description */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.imageUrl}
                alt={`โปสเตอร์งาน ${event.name}`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {event.category || "Concert"}
                </span>
                {isSoldOut ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                    บัตรหมด
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-semibold rounded bg-white text-black inline-flex items-center gap-1.5">
                    <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                    เปิดจำหน่ายบัตร
                  </span>
                )}
                <span className="text-xs text-neutral-500">
                  จัดโดย {event.organizer.name}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {event.name}
              </h1>

              <div className="text-neutral-300 text-sm sm:text-base leading-relaxed whitespace-pre-line border-t border-neutral-900 pt-4">
                {event.description}
              </div>
            </div>

            {/* Event Info Details */}
            <div className="p-6 border border-neutral-800 bg-neutral-950 rounded-lg space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide">
                ข้อมูลการจัดงาน
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500 block">วันที่จัดงาน</span>
                  <p className="font-medium text-neutral-200 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{formattedDate}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500 block">เวลาเริ่มงาน</span>
                  <p className="font-medium text-neutral-200 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{event.startTime} น.</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500 block">สถานที่จัดงาน</span>
                  <p className="font-medium text-neutral-200 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{event.venue}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-neutral-500 block">ผู้จัดงาน</span>
                  <p className="font-medium text-neutral-200 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{event.organizer.name}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Ticket Purchase Box */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-neutral-800 bg-neutral-950 rounded-lg p-6 space-y-6">
              <div className="border-b border-neutral-900 pb-4 space-y-1">
                <p className="text-xs text-neutral-400 uppercase font-medium">บัตรเข้าชมการแสดง</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-white">฿{event.ticketPrice.toFixed(2)}</span>
                  <span className="text-xs text-neutral-500">/ ใบ</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">สถานะบัตร</span>
                  <span className={isSoldOut ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
                    {isSoldOut ? "บัตรหมดแล้ว" : "เปิดจำหน่าย"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">จำนวนที่เปิดขายทั้งหมด</span>
                  <span className="text-neutral-300">{event.totalTickets} ใบ</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">คงเหลือ</span>
                  <span className="text-neutral-200 font-bold">{availableQuantity} ใบ</span>
                </div>
              </div>

              <TicketPurchaseForm
                eventId={event.id}
                ticketPrice={Number(event.ticketPrice)}
                availableQuantity={availableQuantity}
                isSoldOut={isSoldOut}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600">
        <p>E-Tikket Ticketing Platform • MVP</p>
      </footer>
    </div>
  );
}
