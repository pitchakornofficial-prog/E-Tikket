import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { getPrivateArtifact } from "@/lib/storage";
import { generateTicketsPdf, TicketPdfItem } from "@/lib/pdf-generator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const ticketNumberParam = searchParams.get("ticket")?.trim();

  // Missing or non-string token returns uniform 404 (AC-07)
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

  // 1. Authorize: Locate order by viewTokenHash ONLY for PAID status (AC-07)
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

  // Missing, invalid, checkout token, or non-PAID order returns uniform 404 (AC-07)
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

  // 2. Select target tickets (individual ticket or entire order)
  let targetTickets = order.tickets;
  if (ticketNumberParam) {
    const matched = order.tickets.find(
      (t) => t.ticketNumber.toLowerCase() === ticketNumberParam.toLowerCase(),
    );
    if (!matched) {
      const res = NextResponse.json(
        {
          error: {
            code: "TICKET_NOT_FOUND",
            message: "ไม่พบบัตรที่ระบุในคำสั่งซื้อนี้",
          },
        },
        { status: 404 },
      );
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }
    targetTickets = [matched];
  } else {
    // For batch download, exclude CANCELLED tickets if active tickets exist
    const activeTickets = order.tickets.filter((t) => t.status !== "CANCELLED");
    if (activeTickets.length > 0) {
      targetTickets = activeTickets;
    }
  }

  // 3. Fetch QR artifacts from R2 (AC-11)
  try {
    const ticketPdfItems: TicketPdfItem[] = [];

    for (const ticket of targetTickets) {
      if (!ticket.qrArtifactKey) {
        throw new Error("MISSING_QR_KEY");
      }

      const qrArtifact = await getPrivateArtifact(ticket.qrArtifactKey);
      if (!qrArtifact) {
        throw new Error("ARTIFACT_NOT_FOUND");
      }

      ticketPdfItems.push({
        ticketNumber: ticket.ticketNumber,
        status: ticket.status as "OUTSIDE" | "INSIDE" | "CANCELLED",
        qrBuffer: qrArtifact.data,
      });
    }

    // 4. Generate PDF bytes
    const pdfBytes = await generateTicketsPdf({
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      event: {
        name: order.event.name,
        eventDate: order.event.eventDate.toISOString().split("T")[0],
        startTime: order.event.startTime,
        venue: order.event.venue,
        ticketPrice: order.event.ticketPrice.toFixed(2),
      },
      tickets: ticketPdfItems,
    });

    const filename = ticketNumberParam
      ? `ticket-${targetTickets[0].ticketNumber}.pdf`
      : `tickets-order-${order.id.slice(0, 8)}.pdf`;

    const res = new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
    return res;
  } catch {
    const res = NextResponse.json(
      {
        error: {
          code: "ARTIFACT_UNAVAILABLE",
          message: "ไม่สามารถโหลดรูป QR Code สำหรับสร้างไฟล์ PDF ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }
}
