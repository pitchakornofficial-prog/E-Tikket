import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { getPrivateArtifact } from "@/lib/storage";

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

    const formattedOrders = await Promise.all(
      event.orders.map(async (order) => {
        let viewUrl: string | null = null;
        if (order.status === "PAID" && order.deliveryArtifactKey) {
          try {
            const artifact = await getPrivateArtifact(order.deliveryArtifactKey);
            if (artifact) {
              const parsed = JSON.parse(artifact.data.toString("utf-8"));
              viewUrl = parsed.viewUrl || null;
            }
          } catch {
            // Keep viewUrl null
          }
        }

        return {
          id: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          quantity: order.quantity,
          totalAmount: Number(order.totalAmount),
          organizerRevenue: Number(order.organizerRevenue),
          status: order.status,
          viewUrl,
          createdAt: order.createdAt.toISOString(),
          tickets: order.tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            status: t.status,
          })),
        };
      })
    );

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

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  const { id } = await params;

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return jsonResponse({ error: "ไม่พบคอนเสิร์ตที่ต้องการแก้ไข" }, { status: 404 });
    }

    if (existingEvent.organizerId !== auth.session.sub) {
      return jsonResponse(
        { error: "คุณไม่มีสิทธิ์แก้ไขคอนเสิร์ตนี้" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      venue,
      eventDate,
      startTime,
      ticketPrice,
      totalTickets,
      imageUrl,
      status,
    } = body;

    if (
      !name ||
      typeof name !== "string" ||
      !venue ||
      typeof venue !== "string" ||
      !eventDate ||
      !startTime ||
      ticketPrice === undefined ||
      totalTickets === undefined
    ) {
      return jsonResponse(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, สถานที่, วันที่, เวลา, ราคา, จำนวนบัตร)" },
        { status: 400 }
      );
    }

    const priceNum = parseFloat(ticketPrice);
    const ticketsNum = parseInt(totalTickets, 10);

    if (isNaN(priceNum) || priceNum < 0 || isNaN(ticketsNum) || ticketsNum <= 0) {
      return jsonResponse(
        { error: "ราคาบัตรต้องไม่ติดลบ และจำนวนบัตรต้องมากกว่า 0" },
        { status: 400 }
      );
    }

    // Check if tickets have already been sold
    const soldTicketsCount = await prisma.ticket.count({
      where: {
        eventId: id,
        status: { not: "CANCELLED" },
      },
    });

    if (soldTicketsCount > 0) {
      // 1. Prevent altering ticket price
      if (Math.abs(priceNum - Number(existingEvent.ticketPrice)) > 0.001) {
        return jsonResponse(
          { error: "ไม่สามารถแก้ไขราคาบัตรได้ เนื่องจากมีผู้ซื้อบัตรในระบบแล้ว" },
          { status: 400 }
        );
      }

      // 2. Prevent reducing total tickets below existing capacity
      if (ticketsNum < existingEvent.totalTickets) {
        return jsonResponse(
          {
            error: "เมื่อเปิดจำหน่ายบัตรแล้ว ไม่อนุญาตให้ปรับลดจำนวนบัตรทั้งหมด (สามารถปรับเพิ่มโควตาได้เท่านั้น)",
          },
          { status: 400 }
        );
      }

      // 3. Prevent altering eventDate or startTime
      const existingDateStr = existingEvent.eventDate.toISOString().slice(0, 10);
      const newDateStr = new Date(eventDate).toISOString().slice(0, 10);
      if (existingDateStr !== newDateStr || existingEvent.startTime !== startTime.trim()) {
        return jsonResponse(
          {
            error: "ไม่สามารถแก้ไขวันและเวลาจัดงานได้ เนื่องจากมีตั๋วออกให้ผู้ซื้อแล้ว",
          },
          { status: 400 }
        );
      }

      // 4. Prevent altering venue
      if (existingEvent.venue.trim() !== venue.trim()) {
        return jsonResponse(
          {
            error: "ไม่สามารถแก้ไขสถานที่จัดงานได้ เนื่องจากมีตั๋วออกให้ผู้ซื้อแล้ว",
          },
          { status: 400 }
        );
      }
    } else {
      if (ticketsNum < 1) {
        return jsonResponse(
          { error: "จำนวนบัตรทั้งหมดต้องมากกว่า 0" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: name.trim(),
        category: category?.trim() || "Concert",
        description: description?.trim() || "",
        venue: venue.trim(),
        eventDate: new Date(eventDate),
        startTime: startTime.trim(),
        ticketPrice: priceNum,
        totalTickets: ticketsNum,
        imageUrl: imageUrl?.trim() || "",
        status:
          status === "PUBLISHED"
            ? "PUBLISHED"
            : status === "ARCHIVED"
            ? "ARCHIVED"
            : "DRAFT",
      },
    });

    return jsonResponse({ success: true, event: updated }, { status: 200 });
  } catch (err) {
    console.error("Failed to update organizer event:", err);
    return jsonResponse(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลคอนเสิร์ต" },
      { status: 500 }
    );
  }
}
