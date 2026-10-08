import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";

interface RouteParams {
  params: Promise<{ token: string }>;
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return jsonResponse(
      { error: { message: "ต้องระบุ Token สำหรับเข้าใช้งาน" } },
      { status: 400 },
    );
  }

  // 1. Authenticate gate staff via token
  const tokenHash = hashToken(token.trim());
  const checker = await prisma.ticketChecker.findUnique({
    where: { tokenHash },
    include: {
      event: true,
    },
  });

  if (!checker || !checker.isActive) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_TOKEN",
          message: "ลิงก์สแกนเนอร์นี้ไม่ถูกต้อง หมดอายุ หรือถูกยกเลิกการเข้าถึงแล้ว กรุณาติดต่อผู้จัดงาน",
        },
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return jsonResponse({ tickets: [] });
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        eventId: checker.eventId,
        OR: [
          { ticketNumber: { contains: q } },
          { order: { customerName: { contains: q } } },
          { order: { customerPhone: { contains: q } } },
        ],
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        order: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            status: true,
          },
        },
      },
    });

    const formatted = tickets.map((t) => {
      const rawPhone = t.order?.customerPhone || "";
      const maskedPhone =
        rawPhone.length >= 8
          ? `${rawPhone.slice(0, 3)}-xxx-${rawPhone.slice(-4)}`
          : rawPhone;

      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
        customerName: t.order?.customerName || "ไม่ระบุชื่อ",
        customerPhone: maskedPhone,
        orderStatus: t.order?.status || "UNKNOWN",
      };
    });

    return jsonResponse({ tickets: formatted });
  } catch (err) {
    console.error("Failed to search tickets:", err);
    return jsonResponse(
      { error: { message: "เกิดข้อผิดพลาดในการค้นหาตั๋ว" } },
      { status: 500 },
    );
  }
}
