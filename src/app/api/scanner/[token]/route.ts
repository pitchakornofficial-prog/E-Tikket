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

  const tokenHash = hashToken(token.trim());

  try {
    const checker = await prisma.ticketChecker.findUnique({
      where: { tokenHash },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            startTime: true,
            venue: true,
            category: true,
            status: true,
            imageUrl: true,
          },
        },
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
        { status: 404 },
      );
    }

    return jsonResponse({
      valid: true,
      checker: {
        id: checker.id,
        name: checker.name,
        gateNote: checker.gateNote,
      },
      event: {
        id: checker.event.id,
        name: checker.event.name,
        eventDate: checker.event.eventDate.toISOString().split("T")[0],
        startTime: checker.event.startTime,
        venue: checker.event.venue,
        category: checker.event.category,
        status: checker.event.status,
      },
    });
  } catch (error) {
    console.error("Failed to validate scanner token:", error);
    return jsonResponse(
      { error: { message: "ไม่สามารถตรวจสอบสิทธิ์การใช้งานได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
