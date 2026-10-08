import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ADMIN", "ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        checkers: {
          select: {
            id: true,
            name: true,
            gateNote: true,
          },
        },
        orders: {
          where: { status: "PAID" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            quantity: true,
            totalAmount: true,
            organizerRevenue: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
          },
        },
        scans: {
          where: {
            action: "CHECK_IN",
            result: "VALID",
          },
          orderBy: { scannedAt: "asc" },
          select: {
            id: true,
            scannedAt: true,
            checkerId: true,
            checkerName: true,
            staff: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!event) {
      return jsonResponse({ error: "ไม่พบข้อมูลคอนเสิร์ต" }, { status: 404 });
    }

    if (auth.session.role === "ORGANIZER" && event.organizerId !== auth.session.sub) {
      return jsonResponse(
        { error: "ไม่มีสิทธิ์เข้าถึงสถิติของคอนเสิร์ตนี้" },
        { status: 403 }
      );
    }

    // 1. Calculate Sales Timeline
    let totalSold = 0;
    let totalRevenue = 0;
    const salesMap = new Map<string, { date: string; displayDate: string; tickets: number; revenue: number; ordersCount: number }>();

    for (const order of event.orders) {
      totalSold += order.quantity;
      const rev = Number(order.totalAmount);
      totalRevenue += rev;

      const dateKey = order.createdAt.toISOString().slice(0, 10);
      let dayData = salesMap.get(dateKey);
      if (!dayData) {
        const thaiDate = order.createdAt.toLocaleDateString("th-TH", {
          month: "short",
          day: "numeric",
        });
        dayData = {
          date: dateKey,
          displayDate: thaiDate,
          tickets: 0,
          revenue: 0,
          ordersCount: 0,
        };
        salesMap.set(dateKey, dayData);
      }
      dayData.tickets += order.quantity;
      dayData.revenue += rev;
      dayData.ordersCount += 1;
    }

    const salesTrend = Array.from(salesMap.values());

    // 2. Calculate Hourly Check-in Distribution
    const hourlyMap = new Map<string, { hourKey: string; timeSlot: string; count: number }>();

    for (const scan of event.scans) {
      const d = new Date(scan.scannedAt);
      const h = d.getHours();
      const hourKey = String(h).padStart(2, "0");
      const nextH = (h + 1) % 24;
      const timeSlot = `${String(h).padStart(2, "0")}:00 - ${String(nextH).padStart(2, "0")}:00`;

      let slotData = hourlyMap.get(hourKey);
      if (!slotData) {
        slotData = { hourKey, timeSlot, count: 0 };
        hourlyMap.set(hourKey, slotData);
      }
      slotData.count += 1;
    }

    // Sort hourly map
    const checkinDistribution = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // Find peak check-in time
    let peakTimeSlot = "-";
    let peakScanCount = 0;
    for (const slot of checkinDistribution) {
      if (slot.count > peakScanCount) {
        peakScanCount = slot.count;
        peakTimeSlot = slot.timeSlot;
      }
    }

    // 3. Staff & Gate Distribution
    const checkerCountMap = new Map<string, { name: string; gateNote: string | null; count: number }>();

    // Seed assigned checkers
    for (const c of event.checkers) {
      checkerCountMap.set(c.id, {
        name: c.name,
        gateNote: c.gateNote,
        count: 0,
      });
    }

    for (const scan of event.scans) {
      const key = scan.checkerId || "staff-admin";
      let existing = checkerCountMap.get(key);
      if (!existing) {
        existing = {
          name: scan.checkerName || scan.staff.name || "เจ้าหน้าที่",
          gateNote: null,
          count: 0,
        };
        checkerCountMap.set(key, existing);
      }
      existing.count += 1;
    }

    const checkerStats = Array.from(checkerCountMap.values()).sort(
      (a, b) => b.count - a.count
    );

    // 4. Summary KPIs
    const insideCount = event.tickets.filter((t) => t.status === "INSIDE").length;
    const checkinRatePercent =
      totalSold > 0 ? ((insideCount / totalSold) * 100).toFixed(1) : "0";
    const avgTicketsPerOrder =
      event.orders.length > 0 ? (totalSold / event.orders.length).toFixed(1) : "0";

    return jsonResponse({
      event: {
        id: event.id,
        name: event.name,
        eventDate: event.eventDate.toISOString(),
        startTime: event.startTime,
        venue: event.venue,
        ticketPrice: Number(event.ticketPrice),
        totalTickets: event.totalTickets,
      },
      kpis: {
        totalSold,
        totalTickets: event.totalTickets,
        totalRevenue,
        insideCount,
        checkinRatePercent,
        peakTimeSlot,
        peakScanCount,
        avgTicketsPerOrder,
        paidOrdersCount: event.orders.length,
      },
      salesTrend,
      checkinDistribution,
      checkerStats,
    });
  } catch (err) {
    console.error("Failed to aggregate event analytics:", err);
    return jsonResponse(
      { error: "ไม่สามารถประมวลผลข้อมูลสถิติของคอนเสิร์ตได้" },
      { status: 500 }
    );
  }
}
