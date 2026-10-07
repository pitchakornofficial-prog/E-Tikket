import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { generateSecureToken, hashToken } from "@/lib/crypto";

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

  try {
    const whereClause: { organizerId: string; eventId?: string } = {
      organizerId: auth.session.sub,
    };
    if (eventId) {
      whereClause.eventId = eventId;
    }

    const checkers = await prisma.ticketChecker.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            venue: true,
          },
        },
        _count: {
          select: {
            scans: true,
          },
        },
      },
    });

    return jsonResponse({
      success: true,
      checkers: checkers.map((c) => ({
        id: c.id,
        name: c.name,
        gateNote: c.gateNote,
        accessToken: c.accessToken,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        eventId: c.eventId,
        event: {
          id: c.event.id,
          name: c.event.name,
          eventDate: c.event.eventDate.toISOString().split("T")[0],
          venue: c.event.venue,
        },
        scansCount: c._count.scans,
      })),
    });
  } catch (error) {
    console.error("Failed to list checkers:", error);
    return jsonResponse(
      { error: { message: "ไม่สามารถดึงรายชื่อเจ้าหน้าที่ตรวจบัตรได้" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // 1. Authenticate staff (ORGANIZER only)
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { name, eventId, gateNote } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return jsonResponse(
        { error: { message: "กรุณาระบุชื่อเจ้าหน้าที่ตรวจบัตร" } },
        { status: 400 },
      );
    }

    if (!eventId || typeof eventId !== "string") {
      return jsonResponse(
        { error: { message: "กรุณาเลือกคอนเสิร์ตที่รับผิดชอบ" } },
        { status: 400 },
      );
    }

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return jsonResponse(
        { error: { message: "ไม่พบคอนเสิร์ตที่ระบุ" } },
        { status: 404 },
      );
    }

    if (event.organizerId !== auth.session.sub) {
      return jsonResponse(
        { error: { message: "คุณไม่มีสิทธิ์จัดการเจ้าหน้าที่สำหรับคอนเสิร์ตนี้" } },
        { status: 403 },
      );
    }

    // Generate secure CSPRNG token (32 bytes = 64 hex chars)
    const token = generateSecureToken(32);
    const tokenHash = hashToken(token);

    const checker = await prisma.ticketChecker.create({
      data: {
        organizerId: auth.session.sub,
        eventId: event.id,
        name: name.trim(),
        gateNote: gateNote ? gateNote.trim() : null,
        tokenHash,
        accessToken: token,
        isActive: true,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            venue: true,
          },
        },
        _count: {
          select: {
            scans: true,
          },
        },
      },
    });

    return jsonResponse(
      {
        success: true,
        checker: {
          id: checker.id,
          name: checker.name,
          gateNote: checker.gateNote,
          accessToken: checker.accessToken,
          isActive: checker.isActive,
          createdAt: checker.createdAt.toISOString(),
          eventId: checker.eventId,
          event: {
            id: checker.event.id,
            name: checker.event.name,
            eventDate: checker.event.eventDate.toISOString().split("T")[0],
            venue: checker.event.venue,
          },
          scansCount: checker._count.scans,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create checker:", error);
    return jsonResponse(
      { error: { message: "ไม่สามารถสร้างเจ้าหน้าที่ตรวจบัตรได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
