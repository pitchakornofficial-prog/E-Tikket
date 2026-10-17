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
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  try {
    const events = await prisma.event.findMany({
      where: { organizerId: auth.session.sub },
      orderBy: { eventDate: "desc" },
      include: {
        _count: {
          select: {
            checkers: true,
          },
        },
        orders: {
          where: { status: "PAID" },
          select: {
            quantity: true,
            totalAmount: true,
            organizerRevenue: true,
          },
        },
        tickets: {
          select: {
            status: true,
          },
        },
      },
    });

    let overallSoldTickets = 0;
    let overallOrganizerRevenue = 0;
    let overallTotalRevenue = 0;

    const formattedEvents = events.map((ev) => {
      let soldTickets = 0;
      let totalRevenue = 0;
      let organizerRevenue = 0;

      for (const order of ev.orders) {
        soldTickets += order.quantity;
        totalRevenue += Number(order.totalAmount);
        organizerRevenue += Number(order.organizerRevenue);
      }

      const insideCount = ev.tickets.filter((t) => t.status === "INSIDE").length;

      overallSoldTickets += soldTickets;
      overallOrganizerRevenue += organizerRevenue;
      overallTotalRevenue += totalRevenue;

      return {
        id: ev.id,
        name: ev.name,
        description: ev.description,
        venue: ev.venue,
        eventDate: ev.eventDate.toISOString(),
        startTime: ev.startTime,
        ticketPrice: Number(ev.ticketPrice),
        totalTickets: ev.totalTickets,
        category: ev.category,
        status: ev.status,
        imageUrl: ev.imageUrl,
        posterVerticalUrl: ev.posterVerticalUrl || ev.imageUrl,
        posterHorizontalUrl: ev.posterHorizontalUrl || ev.imageUrl,
        artists: ev.artists || "",
        genre: ev.genre || ev.category,
        doorsOpenTime: ev.doorsOpenTime || "",
        showStartTime: ev.showStartTime || ev.startTime,
        showEndTime: ev.showEndTime || "",
        saleStartAt: ev.saleStartAt ? ev.saleStartAt.toISOString() : null,
        saleEndAt: ev.saleEndAt ? ev.saleEndAt.toISOString() : null,
        googleMapsUrl: ev.googleMapsUrl || "",
        entryRules: ev.entryRules || "",
        studentDiscountActive: ev.studentDiscountActive,
        studentPrice: ev.studentPrice ? Number(ev.studentPrice) : null,
        createdAt: ev.createdAt.toISOString(),
        soldTickets,
        insideCount,
        totalRevenue,
        organizerRevenue,
        checkersCount: ev._count.checkers,
      };
    });

    return jsonResponse({
      summary: {
        totalEvents: events.length,
        totalSoldTickets: overallSoldTickets,
        totalOrganizerRevenue: overallOrganizerRevenue,
        totalRevenue: overallTotalRevenue,
      },
      events: formattedEvents,
    });
  } catch (err) {
    console.error("Failed to fetch organizer events:", err);
    return jsonResponse({ error: "ไม่สามารถดึงข้อมูลคอนเสิร์ตได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  try {
    const body = await request.json();
    const {
      name,
      category,
      genre,
      artists,
      description,
      entryRules,
      venue,
      googleMapsUrl,
      eventDate,
      startTime,
      doorsOpenTime,
      showStartTime,
      showEndTime,
      saleStartAt,
      saleEndAt,
      ticketPrice,
      totalTickets,
      imageUrl,
      posterVerticalUrl,
      posterHorizontalUrl,
      status,
    } = body;

    if (
      !name ||
      typeof name !== "string" ||
      !venue ||
      typeof venue !== "string" ||
      !eventDate ||
      ticketPrice === undefined ||
      totalTickets === undefined
    ) {
      return jsonResponse(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, สถานที่, วันที่, ราคา, จำนวนบัตร)" },
        { status: 400 },
      );
    }

    const priceNum = parseFloat(ticketPrice);
    const ticketsNum = parseInt(totalTickets, 10);

    if (isNaN(priceNum) || priceNum < 0 || isNaN(ticketsNum) || ticketsNum <= 0) {
      return jsonResponse(
        { error: "ราคาบัตรต้องไม่ติดลบ และจำนวนบัตรต้องมากกว่า 0" },
        { status: 400 },
      );
    }

    const finalStartTime = (startTime || showStartTime || "19:00").trim();
    const vertUrl = (posterVerticalUrl || imageUrl || "/poster-indie.svg").trim();
    const horizUrl = (posterHorizontalUrl || imageUrl || vertUrl).trim();

    const createdEvent = await prisma.event.create({
      data: {
        name: name.trim(),
        category: (genre || category || "Concert").trim(),
        genre: (genre || category || "Concert").trim(),
        artists: (artists || "").trim(),
        description: (description || "").trim(),
        entryRules: (entryRules || "").trim(),
        venue: venue.trim(),
        googleMapsUrl: (googleMapsUrl || "").trim(),
        eventDate: new Date(eventDate),
        startTime: finalStartTime,
        doorsOpenTime: (doorsOpenTime || "").trim(),
        showStartTime: (showStartTime || finalStartTime).trim(),
        showEndTime: (showEndTime || "").trim(),
        saleStartAt: saleStartAt ? new Date(saleStartAt) : null,
        saleEndAt: saleEndAt ? new Date(saleEndAt) : null,
        ticketPrice: priceNum,
        totalTickets: ticketsNum,
        imageUrl: vertUrl,
        posterVerticalUrl: vertUrl,
        posterHorizontalUrl: horizUrl,
        studentDiscountActive: false, // AC-03: Organizers cannot activate student privilege
        studentPrice: null,
        status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        organizerId: auth.session.sub,
      },
    });

    return jsonResponse(
      { success: true, event: createdEvent },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to create organizer event:", err);
    return jsonResponse(
      { error: "เกิดข้อผิดพลาดในการสร้างคอนเสิร์ต" },
      { status: 500 },
    );
  }
}
