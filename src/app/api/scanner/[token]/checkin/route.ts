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

export async function POST(request: Request, { params }: RouteParams) {
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

  // 2. Parse and validate input body
  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "รูปแบบข้อมูลคำขอไม่ถูกต้อง",
        },
      },
      { status: 422 },
    );
  }

  const { qrToken, ticketNumber, action } = body || {};

  if (
    (!qrToken || typeof qrToken !== "string" || qrToken.trim() === "") &&
    (!ticketNumber || typeof ticketNumber !== "string" || ticketNumber.trim() === "")
  ) {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "ต้องระบุ qrToken หรือ ticketNumber",
        },
      },
      { status: 422 },
    );
  }

  if (action !== "CHECK_IN" && action !== "CHECK_OUT") {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "action ต้องเป็น CHECK_IN หรือ CHECK_OUT เท่านั้น",
        },
      },
      { status: 422 },
    );
  }

  const event = checker.event;
  const staffId = checker.organizerId;
  const checkerId = checker.id;
  const checkerName = checker.gateNote
    ? `${checker.name} (${checker.gateNote})`
    : checker.name;

  // 3. Look up ticket by SHA-256 hash or ticketNumber
  let ticket = null;
  if (qrToken && typeof qrToken === "string" && qrToken.trim() !== "") {
    const scannedSecret = qrToken.trim();
    const ticketTokenHash = hashToken(scannedSecret);
    ticket = await prisma.ticket.findFirst({
      where: { qrTokenHash: ticketTokenHash },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } else if (ticketNumber && typeof ticketNumber === "string" && ticketNumber.trim() !== "") {
    ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: ticketNumber.trim(),
        eventId: event.id,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  const now = new Date();

  // 4. Atomic evaluation, CAS state transition, and audit record with checkerName & checkerId
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Case 4a: Unknown ticket secret (INVALID)
      if (!ticket) {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: null,
            staffId,
            checkerId,
            checkerName,
            action,
            result: "INVALID",
            scannedAt: now,
          },
        });

        return {
          result: "INVALID" as const,
          action,
          eventId: event.id,
          scannedAt: now.toISOString(),
          staffName: checkerName,
        };
      }

      // Case 4b: Ticket belongs to a different event (WRONG_EVENT)
      if (ticket.eventId !== event.id) {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
            checkerId,
            checkerName,
            action,
            result: "WRONG_EVENT",
            scannedAt: now,
          },
        });

        return {
          result: "WRONG_EVENT" as const,
          action,
          eventId: event.id,
          scannedAt: now.toISOString(),
          staffName: checkerName,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
          },
        };
      }

      // Case 4c: Order not PAID (UNPAID)
      if (ticket.order.status !== "PAID") {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
            checkerId,
            checkerName,
            action,
            result: "UNPAID",
            scannedAt: now,
          },
        });

        return {
          result: "UNPAID" as const,
          action,
          eventId: event.id,
          scannedAt: now.toISOString(),
          staffName: checkerName,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
          },
        };
      }

      // Case 4d: Ticket cancelled (CANCELLED)
      if (ticket.status === "CANCELLED") {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
            checkerId,
            checkerName,
            action,
            result: "CANCELLED",
            scannedAt: now,
          },
        });

        return {
          result: "CANCELLED" as const,
          action,
          eventId: event.id,
          scannedAt: now.toISOString(),
          staffName: checkerName,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
          },
        };
      }

      // Case 4e: CHECK_IN action
      if (action === "CHECK_IN") {
        // Atomic CAS: Only transition OUTSIDE -> INSIDE
        const updated = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: "OUTSIDE",
          },
          data: {
            status: "INSIDE",
          },
        });

        if (updated.count === 1) {
          await tx.ticketScan.create({
            data: {
              eventId: event.id,
              ticketId: ticket.id,
              staffId,
              checkerId,
              checkerName,
              action,
              result: "VALID",
              scannedAt: now,
            },
          });

          return {
            result: "VALID" as const,
            action,
            eventId: event.id,
            scannedAt: now.toISOString(),
            staffName: checkerName,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              status: "INSIDE" as const,
            },
          };
        }

        // CAS failed: check current status
        const currentTicket = await tx.ticket.findUnique({
          where: { id: ticket.id },
        });

        if (currentTicket?.status === "CANCELLED") {
          await tx.ticketScan.create({
            data: {
              eventId: event.id,
              ticketId: ticket.id,
              staffId,
              checkerId,
              checkerName,
              action,
              result: "CANCELLED",
              scannedAt: now,
            },
          });

          return {
            result: "CANCELLED" as const,
            action,
            eventId: event.id,
            scannedAt: now.toISOString(),
            staffName: checkerName,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              status: "CANCELLED" as const,
            },
          };
        }

        // Already INSIDE: duplicate entry attempt
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
            checkerId,
            checkerName,
            action,
            result: "ALREADY_CHECKED_IN",
            scannedAt: now,
          },
        });

        return {
          result: "ALREADY_CHECKED_IN" as const,
          action,
          eventId: event.id,
          scannedAt: now.toISOString(),
          staffName: checkerName,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: "INSIDE" as const,
          },
        };
      }

      // Case 4f: CHECK_OUT action
      if (action === "CHECK_OUT") {
        // Atomic CAS: Only transition INSIDE -> OUTSIDE
        const updated = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: "INSIDE",
          },
          data: {
            status: "OUTSIDE",
          },
        });

        if (updated.count === 1) {
          await tx.ticketScan.create({
            data: {
              eventId: event.id,
              ticketId: ticket.id,
              staffId,
              checkerId,
              checkerName,
              action,
              result: "VALID",
              scannedAt: now,
            },
          });

          return {
            result: "VALID" as const,
            action,
            eventId: event.id,
            scannedAt: now.toISOString(),
            staffName: checkerName,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              status: "OUTSIDE" as const,
            },
          };
        }

        // CAS failed: check current status
        const currentTicket = await tx.ticket.findUnique({
          where: { id: ticket.id },
        });

        if (currentTicket?.status === "CANCELLED") {
          await tx.ticketScan.create({
            data: {
              eventId: event.id,
              ticketId: ticket.id,
              staffId,
              checkerId,
              checkerName,
              action,
              result: "CANCELLED",
              scannedAt: now,
            },
          });

          return {
            result: "CANCELLED" as const,
            action,
            eventId: event.id,
            scannedAt: now.toISOString(),
            staffName: checkerName,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              status: "CANCELLED" as const,
            },
          };
        }

        // Ticket is OUTSIDE: cannot check out
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
            checkerId,
            checkerName,
            action,
            result: "INVALID_ACTION",
            scannedAt: now,
          },
        });

        return {
          result: "INVALID_ACTION" as const,
          action,
          eventId: event.id,
          scannedAt: now.toISOString(),
          staffName: checkerName,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: "OUTSIDE" as const,
          },
        };
      }

      throw new Error("UNHANDLED_ACTION");
    });

    return jsonResponse(result, { status: 200 });
  } catch (error) {
    console.error("Scanner checkin transaction error:", error);
    return jsonResponse(
      {
        error: {
          code: "SCAN_UNCONFIRMED",
          message: "ระบบไม่สามารถบันทึกและตรวจสอบสิทธิ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
  }
}
