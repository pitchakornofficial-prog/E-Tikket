import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import { putPrivateArtifact, getPrivateArtifact } from "@/lib/storage";
import { sendReissueTicketEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ORGANIZER", "ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id: eventId } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return jsonResponse({ error: "ไม่พบข้อมูลคอนเสิร์ต" }, { status: 404 });
    }

    if (auth.session.role === "ORGANIZER" && event.organizerId !== auth.session.sub) {
      return jsonResponse({ error: "คุณไม่มีสิทธิ์จัดการคอนเสิร์ตนี้" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketNumber, reason } = body;

    if (!ticketNumber || typeof ticketNumber !== "string") {
      return jsonResponse({ error: "กรุณาระบุหมายเลขบัตรที่ต้องการยกเลิกและออกใหม่" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: ticketNumber.trim(),
        eventId,
      },
      include: {
        order: true,
      },
    });

    if (!ticket) {
      return jsonResponse({ error: "ไม่พบบัตรหมายเลขนี้ในคอนเสิร์ตดังกล่าว" }, { status: 404 });
    }

    if (ticket.status === "INSIDE") {
      return jsonResponse({ error: "ไม่สามารถออกบัตรใหม่ได้ เนื่องจากบัตรถูกสแกนเข้างานไปแล้ว" }, { status: 400 });
    }

    if (ticket.status === "CANCELLED") {
      return jsonResponse({ error: "บัตรใบนี้ถูกยกเลิกไปแล้ว ไม่สามารถดำเนินการซ้ำได้" }, { status: 400 });
    }

    const now = new Date();
    const baseTicketNumber = ticket.ticketNumber.replace(/-R\d+$/, "");
    const newTicketNumber = `${baseTicketNumber}-R1`;

    const newQrSecret = generateSecureToken(32);
    const newQrTokenHash = hashToken(newQrSecret);

    const qrBuffer = await QRCode.toBuffer(newQrSecret, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const newQrArtifactKey = `tickets/${ticket.orderId}/${newTicketNumber}-${generateSecureToken(8)}.png`;
    await putPrivateArtifact(newQrArtifactKey, qrBuffer, "image/png");

    const newTicket = await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "CANCELLED",
          reissueCount: ticket.reissueCount + 1,
        },
      });

      const created = await tx.ticket.create({
        data: {
          eventId,
          orderId: ticket.orderId,
          ticketNumber: newTicketNumber,
          qrTokenHash: newQrTokenHash,
          qrArtifactKey: newQrArtifactKey,
          status: "OUTSIDE",
          reissueCount: 1,
          reissuedFromId: ticket.id,
        },
      });

      await tx.ticketScan.create({
        data: {
          eventId,
          ticketId: ticket.id,
          staffId: auth.session.sub,
          action: "CHECK_IN",
          result: "CANCELLED",
          note: `ORGANIZER_REISSUE: Replaced by ${newTicketNumber}. Reason: ${reason || "Staff initiated reissue"}`,
          scannedAt: now,
        },
      });

      return created;
    });

    if (ticket.order.deliveryArtifactKey) {
      try {
        const payloadArtifact = await getPrivateArtifact(ticket.order.deliveryArtifactKey);
        if (payloadArtifact) {
          const payload = JSON.parse(payloadArtifact.data.toString("utf-8"));
          payload.tickets = payload.tickets.filter(
            (t: { ticketNumber: string }) => t.ticketNumber !== ticket.ticketNumber
          );
          payload.tickets.push({
            ticketNumber: newTicketNumber,
            qrArtifactKey: newQrArtifactKey,
          });
          await putPrivateArtifact(
            ticket.order.deliveryArtifactKey,
            Buffer.from(JSON.stringify(payload), "utf-8"),
            "application/json"
          );
        }
      } catch (e) {
        console.error("Failed to update delivery payload artifact upon organizer reissue:", e);
      }
    }

    sendReissueTicketEmail({
      to: ticket.order.customerEmail,
      customerName: ticket.order.customerName,
      orderId: ticket.order.id,
      eventName: event.name,
      oldTicketNumber: ticket.ticketNumber,
      newTicketNumber,
      viewUrl: `/tickets?token=${ticket.order.viewTokenHash || ""}`,
    }).catch((err) => {
      console.error("Failed to dispatch email after organizer reissue:", err);
    });

    return jsonResponse({
      success: true,
      message: `ยกเลิกบัตรเดิม (${ticket.ticketNumber}) และออกบัตรใหม่ (${newTicket.ticketNumber}) เรียบร้อยแล้ว`,
      oldTicketNumber: ticket.ticketNumber,
      newTicketNumber: newTicket.ticketNumber,
    });
  } catch (err) {
    console.error("Failed organizer ticket reissue:", err);
    return jsonResponse({ error: "เกิดข้อผิดพลาดในการยกเลิกและออกบัตรใหม่" }, { status: 500 });
  }
}
