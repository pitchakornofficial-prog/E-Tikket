import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { getPrivateArtifact } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Missing or non-string token returns uniform 404 TICKETS_NOT_FOUND
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    const res = NextResponse.json(
      {
        error: {
          code: "TICKETS_NOT_FOUND",
          message: "ไม่พบข้อมูลบัตรเข้างาน หรือลิงก์การเข้าถึงไม่ถูกต้อง",
        },
      },
      { status: 404 },
    );
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  const tokenHash = hashToken(token.trim());

  // 1. Authorize: Locate order by viewTokenHash ONLY for PAID status
  const order = await prisma.order.findFirst({
    where: {
      viewTokenHash: tokenHash,
      status: "PAID",
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          eventDate: true,
          startTime: true,
          venue: true,
          ticketPrice: true,
        },
      },
      tickets: {
        orderBy: { ticketNumber: "asc" },
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          qrArtifactKey: true,
        },
      },
    },
  });

  // Missing, invalid, checkout token, or non-PAID order returns uniform 404 TICKETS_NOT_FOUND
  if (!order || order.tickets.length === 0) {
    const res = NextResponse.json(
      {
        error: {
          code: "TICKETS_NOT_FOUND",
          message: "ไม่พบข้อมูลบัตรเข้างาน หรือคำสั่งซื้อยังไม่ได้รับการอนุมัติ",
        },
      },
      { status: 404 },
    );
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  // 2. Fetch original private QR artifacts from R2 for each ticket
  try {
    const ticketItems: Array<{
      ticketNumber: string;
      status: "OUTSIDE" | "INSIDE" | "CANCELLED";
      qrDataUrl: string;
    }> = [];

    for (const ticket of order.tickets) {
      if (!ticket.qrArtifactKey) {
        throw new Error("MISSING_QR_KEY");
      }

      const qrArtifact = await getPrivateArtifact(ticket.qrArtifactKey);
      if (!qrArtifact) {
        throw new Error("ARTIFACT_NOT_FOUND");
      }

      ticketItems.push({
        ticketNumber: ticket.ticketNumber,
        status: ticket.status as "OUTSIDE" | "INSIDE" | "CANCELLED",
        qrDataUrl: `data:${qrArtifact.contentType};base64,${qrArtifact.data.toString("base64")}`,
      });
    }

    const res = NextResponse.json(
      {
        order: {
          id: order.id,
          event: {
            id: order.event.id,
            name: order.event.name,
            eventDate: order.event.eventDate.toISOString().split("T")[0],
            startTime: order.event.startTime,
            venue: order.event.venue,
            ticketPrice: order.event.ticketPrice.toFixed(2),
          },
          quantity: order.quantity,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
        },
        tickets: ticketItems,
      },
      { status: 200 },
    );
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  } catch {
    const res = NextResponse.json(
      {
        error: {
          code: "ARTIFACT_UNAVAILABLE",
          message: "ไม่สามารถโหลดรูป QR Code สำหรับเข้างานได้ในขณะนี้ กรุณารีเฟรชหรือลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }
}
