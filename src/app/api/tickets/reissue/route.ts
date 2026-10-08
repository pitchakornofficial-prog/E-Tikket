import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import { putPrivateArtifact, getPrivateArtifact } from "@/lib/storage";
import { sendReissueTicketEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, ticketNumber, reason } = body;

    if (!token || typeof token !== "string" || !ticketNumber || typeof ticketNumber !== "string") {
      return NextResponse.json(
        { error: "ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาระบุรหัสการเข้าถึงและหมายเลขบัตร" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token.trim());

    // 1. Authorize by order viewTokenHash
    const order = await prisma.order.findFirst({
      where: {
        viewTokenHash: tokenHash,
        status: "PAID",
      },
      include: {
        event: true,
        tickets: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลคำสั่งซื้อ หรือไม่มีสิทธิ์เข้าถึงบัตรเข้างานนี้" },
        { status: 404 }
      );
    }

    // 2. Locate target ticket in order
    const ticket = order.tickets.find((t) => t.ticketNumber === ticketNumber.trim());
    if (!ticket) {
      return NextResponse.json(
        { error: "ไม่พบบัตรที่ต้องการยกเลิกและออกใหม่ในคำสั่งซื้อนี้" },
        { status: 404 }
      );
    }

    // 3. Time constraint: Must be before event start time
    const [hours, minutes] = order.event.startTime.split(":").map(Number);
    const eventStartTime = new Date(order.event.eventDate);
    eventStartTime.setHours(isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);

    const now = new Date();
    if (now >= eventStartTime) {
      return NextResponse.json(
        {
          error:
            "ไม่สามารถขอออกบัตรใหม่ได้ เนื่องจากถึงหรือเลยกำหนดเวลาเริ่มงานแล้ว (สามารถทำได้ก่อนงานเริ่มเท่านั้น)",
        },
        { status: 400 }
      );
    }

    // 4. Scan & status constraint: Must not be checked in or cancelled
    if (ticket.status === "INSIDE") {
      return NextResponse.json(
        { error: "ไม่สามารถขอออกบัตรใหม่ได้ เนื่องจากบัตรใบนี้ถูกสแกนเข้างานไปแล้ว" },
        { status: 400 }
      );
    }

    if (ticket.status === "CANCELLED") {
      return NextResponse.json(
        { error: "บัตรใบนี้ถูกยกเลิกไปแล้ว ไม่สามารถดำเนินการซ้ำได้" },
        { status: 400 }
      );
    }

    if (ticket.status !== "OUTSIDE") {
      return NextResponse.json(
        { error: "สถานะของบัตรไม่ถูกต้องสำหรับการขอออกบัตรใหม่" },
        { status: 400 }
      );
    }

    // 5. Quota constraint: Exactly 1 reissue per ticket
    if (ticket.reissueCount >= 1 || ticket.reissuedFromId) {
      return NextResponse.json(
        { error: "บัตรใบนี้เคยถูกขอออกใหม่ไปแล้ว (จำกัดสิทธิ์ออกบัตรใหม่ได้สูงสุด 1 ครั้งต่อใบ)" },
        { status: 400 }
      );
    }

    const alreadyReissued = order.tickets.some((t) => t.reissuedFromId === ticket.id);
    if (alreadyReissued) {
      return NextResponse.json(
        { error: "บัตรใบนี้มีประวัติถูกยกเลิกและออกใหม่ไปแล้ว" },
        { status: 400 }
      );
    }

    // 6. Generate new CSPRNG QR secret and render new QR code artifact
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

    const newQrArtifactKey = `tickets/${order.id}/${newTicketNumber}-${generateSecureToken(8)}.png`;
    await putPrivateArtifact(newQrArtifactKey, qrBuffer, "image/png");

    // 7. Atomic database transaction
    const newTicket = await prisma.$transaction(async (tx) => {
      // Mark old ticket as CANCELLED
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "CANCELLED",
          reissueCount: ticket.reissueCount + 1,
        },
      });

      // Create new replacement ticket
      const created = await tx.ticket.create({
        data: {
          eventId: order.event.id,
          orderId: order.id,
          ticketNumber: newTicketNumber,
          qrTokenHash: newQrTokenHash,
          qrArtifactKey: newQrArtifactKey,
          status: "OUTSIDE",
          reissueCount: 1,
          reissuedFromId: ticket.id,
        },
      });

      // Audit scan entry for old ticket
      await tx.ticketScan.create({
        data: {
          eventId: order.event.id,
          ticketId: ticket.id,
          staffId: order.event.organizerId,
          action: "CHECK_IN",
          result: "CANCELLED",
          note: `CUSTOMER_REISSUE: Leaked QR reported. Replaced by ${newTicketNumber}. Reason: ${
            reason || "QR code leaked"
          }`,
          scannedAt: now,
        },
      });

      return created;
    });

    // 8. Update delivery payload artifact in R2 (best effort)
    if (order.deliveryArtifactKey) {
      try {
        const payloadArtifact = await getPrivateArtifact(order.deliveryArtifactKey);
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
            order.deliveryArtifactKey,
            Buffer.from(JSON.stringify(payload), "utf-8"),
            "application/json"
          );
        }
      } catch (e) {
        console.error("Failed to update delivery payload artifact upon reissue:", e);
      }
    }

    // 9. Send email notification to customer (best effort)
    sendReissueTicketEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderId: order.id,
      eventName: order.event.name,
      oldTicketNumber: ticket.ticketNumber,
      newTicketNumber: newTicketNumber,
      viewUrl: `/tickets?token=${token.trim()}`,
    }).catch((err) => {
      console.error("Failed to dispatch reissue notification email:", err);
    });

    const res = NextResponse.json({
      success: true,
      message: `ยกเลิกบัตรเดิม (${ticket.ticketNumber}) และออกบัตรใหม่ (${newTicketNumber}) ทดแทนเรียบร้อยแล้ว`,
      oldTicketNumber: ticket.ticketNumber,
      newTicketNumber: newTicket.ticketNumber,
    });
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  } catch (error) {
    console.error("Failed to reissue ticket:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการยกเลิกและออกบัตรใหม่ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
