import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function GET(request: Request) {
  // 1. Authenticate staff (ORGANIZER only)
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const tier = searchParams.get("tier");

  try {
    // 2. Fetch all events owned by organizer for dropdown and stats
    const organizerEvents = await prisma.event.findMany({
      where: { organizerId: auth.session.sub },
      select: {
        id: true,
        name: true,
        totalTickets: true,
      },
      orderBy: { eventDate: "desc" },
    });

    const eventIds = organizerEvents.map((e) => e.id);

    if (eventIds.length === 0) {
      return jsonResponse({
        events: [],
        orders: [],
        stats: {
          totalTicketsSold: 0,
          totalCapacity: 0,
          paidOrdersCount: 0,
          totalRevenue: 0,
          generalRevenue: 0,
          studentRevenue: 0,
          generalCount: 0,
          studentCount: 0,
        },
      });
    }

    // 3. Query all orders for calculation
    const allOrders = await prisma.order.findMany({
      where: {
        eventId: { in: eventIds },
      },
      select: {
        id: true,
        eventId: true,
        status: true,
        quantity: true,
        ticketTier: true,
        totalAmount: true,
        organizerRevenue: true,
      },
    });

    let totalTicketsSold = 0;
    let paidOrdersCount = 0;
    let totalRevenue = 0;
    let generalRevenue = 0;
    let studentRevenue = 0;
    let generalCount = 0;
    let studentCount = 0;

    for (const ord of allOrders) {
      if (ord.ticketTier === "STUDENT") {
        studentCount += 1;
      } else {
        generalCount += 1;
      }

      if (ord.status === "PAID") {
        paidOrdersCount += 1;
        totalTicketsSold += ord.quantity;
        const amt = Number(ord.totalAmount);
        totalRevenue += amt;
        if (ord.ticketTier === "STUDENT") {
          studentRevenue += amt;
        } else {
          generalRevenue += amt;
        }
      }
    }

    const totalCapacity = organizerEvents.reduce((acc, ev) => acc + ev.totalTickets, 0);

    // 4. Query filtered orders for table
    const whereFilter: {
      eventId: string | { in: string[] };
      ticketTier?: string;
    } = {
      eventId: eventId && eventId !== "ALL" ? eventId : { in: eventIds },
    };

    if (tier && tier !== "ALL") {
      whereFilter.ticketTier = tier;
    }

    const orders = await prisma.order.findMany({
      where: whereFilter,
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
          },
          orderBy: { ticketNumber: "asc" },
        },
      },
    });

    const formattedOrders = orders.map((ord) => ({
      id: ord.id,
      customerName: ord.customerName,
      customerEmail: ord.customerEmail,
      customerPhone: ord.customerPhone,
      quantity: ord.quantity,
      ticketTier: ord.ticketTier || "GENERAL",
      totalAmount: Number(ord.totalAmount),
      organizerRevenue: Number(ord.organizerRevenue),
      status: ord.status,
      createdAt: ord.createdAt.toISOString(),
      event: {
        id: ord.event.id,
        name: ord.event.name,
      },
      tickets: ord.tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
      })),
    }));

    return jsonResponse({
      events: organizerEvents.map((e) => ({ id: e.id, name: e.name })),
      orders: formattedOrders,
      stats: {
        totalTicketsSold,
        totalCapacity,
        paidOrdersCount,
        totalRevenue,
        generalRevenue,
        studentRevenue,
        generalCount,
        studentCount,
      },
    });
  } catch (err) {
    console.error("Failed to load organizer orders:", err);
    return jsonResponse(
      { error: "เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อผู้จัด" },
      { status: 500 }
    );
  }
}
