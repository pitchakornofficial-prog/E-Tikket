import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            checkers: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            tickets: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
              },
            },
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!event) {
      return jsonResponse({ error: "ไม่พบข้อมูลคอนเสิร์ต" }, { status: 404 });
    }

    if (event.organizerId !== auth.session.sub) {
      return jsonResponse(
        { error: "ไม่มีสิทธิ์เข้าถึงข้อมูลคอนเสิร์ตนี้" },
        { status: 403 }
      );
    }

    let soldTickets = 0;
    let totalRevenue = 0;
    let organizerRevenue = 0;

    for (const order of event.orders) {
      if (order.status === "PAID") {
        soldTickets += order.quantity;
        totalRevenue += Number(order.totalAmount);
        organizerRevenue += Number(order.organizerRevenue);
      }
    }

    const insideCount = event.tickets.filter((t) => t.status === "INSIDE").length;
    const outsideCount = event.tickets.filter((t) => t.status === "OUTSIDE").length;
    const cancelledCount = event.tickets.filter((t) => t.status === "CANCELLED").length;
    const checkinRatePercent =
      soldTickets > 0 ? ((insideCount / soldTickets) * 100).toFixed(1) : "0";

    const formattedOrders = event.orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      quantity: order.quantity,
      totalAmount: Number(order.totalAmount),
      organizerRevenue: Number(order.organizerRevenue),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      tickets: order.tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
      })),
    }));

    return jsonResponse({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        venue: event.venue,
        eventDate: event.eventDate.toISOString(),
        startTime: event.startTime,
        ticketPrice: Number(event.ticketPrice),
        totalTickets: event.totalTickets,
        category: event.category,
        status: event.status,
        imageUrl: event.imageUrl,
        createdAt: event.createdAt.toISOString(),
        checkersCount: event._count.checkers,
      },
      stats: {
        soldTickets,
        totalTickets: event.totalTickets,
        totalRevenue,
        organizerRevenue,
        insideCount,
        outsideCount,
        cancelledCount,
        checkinRatePercent,
      },
      orders: formattedOrders,
    });
  } catch (err) {
    console.error("Failed to fetch event details for organizer:", err);
    return jsonResponse(
      { error: "ไม่สามารถดึงข้อมูลรายละเอียดคอนเสิร์ตได้" },
      { status: 500 }
    );
  }
}
