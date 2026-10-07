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
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  // Case 1: eventId === "ALL" -> Return recent scans across ALL events owned by this organizer
  if (eventId === "ALL") {
    const myEvents = await prisma.event.findMany({
      where: { organizerId: auth.session.sub },
      select: { id: true, name: true },
    });

    const eventIds = myEvents.map((e) => e.id);

    const recentScans = await prisma.ticketScan.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { scannedAt: "desc" },
      take: 50,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        ticket: {
          select: {
            ticketNumber: true,
          },
        },
        staff: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonResponse(
      {
        scans: recentScans.map((s) => ({
          id: s.id,
          eventId: s.event.id,
          eventName: s.event.name,
          action: s.action,
          result: s.result,
          scannedAt: s.scannedAt.toISOString(),
          ticketNumber: s.ticket?.ticketNumber || null,
          staffName: s.checkerName || s.staff.name,
          checkerName: s.checkerName || null,
        })),
      },
      { status: 200 },
    );
  }

  // Case 2: Specific eventId provided -> Verify ownership and return recent scans for that event
  if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return jsonResponse(
        {
          error: {
            code: "EVENT_NOT_FOUND",
            message: "ไม่พบงานแสดงที่ระบุ",
          },
        },
        { status: 404 },
      );
    }

    if (event.organizerId !== auth.session.sub) {
      return jsonResponse(
        {
          error: {
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์เข้าถึงประวัติการสแกนสำหรับงานแสดงนี้",
          },
        },
        { status: 403 },
      );
    }

    // Fetch recent 30 scans for this event
    const recentScans = await prisma.ticketScan.findMany({
      where: { eventId },
      orderBy: { scannedAt: "desc" },
      take: 30,
      include: {
        ticket: {
          select: {
            ticketNumber: true,
          },
        },
        staff: {
          select: {
            name: true,
          },
        },
      },
    });

    return jsonResponse(
      {
        event: {
          id: event.id,
          name: event.name,
          eventDate: event.eventDate.toISOString().split("T")[0],
          startTime: event.startTime,
          venue: event.venue,
        },
        scans: recentScans.map((s) => ({
          id: s.id,
          eventId: event.id,
          eventName: event.name,
          action: s.action,
          result: s.result,
          scannedAt: s.scannedAt.toISOString(),
          ticketNumber: s.ticket?.ticketNumber || null,
          staffName: s.checkerName || s.staff.name,
          checkerName: s.checkerName || null,
        })),
      },
      { status: 200 },
    );
  }

  // Case 3: If eventId is not provided, list all events owned by this organizer
  const events = await prisma.event.findMany({
    where: { organizerId: auth.session.sub },
    orderBy: { eventDate: "asc" },
    select: {
      id: true,
      name: true,
      eventDate: true,
      startTime: true,
      venue: true,
      status: true,
    },
  });

  return jsonResponse(
    {
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        eventDate: e.eventDate.toISOString().split("T")[0],
        startTime: e.startTime,
        venue: e.venue,
        status: e.status,
      })),
    },
    { status: 200 },
  );
}
