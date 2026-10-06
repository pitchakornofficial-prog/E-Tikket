import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function POST(request: Request) {
  // 1. Same-origin / CSRF check
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const reqUrl = new URL(request.url);
      if (originUrl.host !== reqUrl.host) {
        return jsonResponse(
          {
            error: {
              code: "FORBIDDEN",
              message: "คำขอข้ามโดเมนไม่ได้รับอนุญาต (Cross-origin forbidden)",
            },
          },
          { status: 403 },
        );
      }
    } catch {
      return jsonResponse(
        {
          error: {
            code: "FORBIDDEN",
            message: "Origin header ไม่ถูกต้อง",
          },
        },
        { status: 403 },
      );
    }
  }

  // 2. Authenticate staff (ORGANIZER only)
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  // 3. Parse and validate input body
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

  const { eventId, qrToken, action } = body || {};

  if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "ต้องระบุ eventId",
        },
      },
      { status: 422 },
    );
  }

  if (!qrToken || typeof qrToken !== "string" || qrToken.trim() === "") {
    return jsonResponse(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "ต้องระบุ qrToken",
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

  // 4. Verify event ownership/management permission
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return jsonResponse(
      {
        error: {
          code: "EVENT_NOT_FOUND",
          message: "ไม่พบงานแสดงที่เลือก",
        },
      },
      { status: 404 },
    );
  }

  // ORGANIZER can only scan for their own events
  if (event.organizerId !== auth.session.sub) {
    return jsonResponse(
      {
        error: {
          code: "FORBIDDEN",
          message: "คุณไม่มีสิทธิ์จัดการหรือสแกนบัตรสำหรับงานแสดงนี้",
        },
      },
      { status: 403 },
    );
  }

  const staffId = auth.session.sub;
  const scannedSecret = qrToken.trim();
  const tokenHash = hashToken(scannedSecret);

  // 5. Look up ticket by SHA-256 hash
  // AC-10: ticket number alone is NOT a valid scan credential.
  const ticket = await prisma.ticket.findFirst({
    where: { qrTokenHash: tokenHash },
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

  const now = new Date();

  // 6. Atomic evaluation, CAS state transition, and audit record
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Case 6a: Unknown ticket secret (INVALID)
      if (!ticket) {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: null,
            staffId,
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
        };
      }

      // Case 6b: Ticket belongs to a different event (WRONG_EVENT)
      if (ticket.eventId !== event.id) {
        await tx.ticketScan.create({
          data: {
            eventId: event.id, // selected event is recorded
            ticketId: ticket.id,
            staffId,
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
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
          },
        };
      }

      // Case 6c: Order not PAID (UNPAID)
      if (ticket.order.status !== "PAID") {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
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
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
          },
        };
      }

      // Case 6d: Ticket cancelled (CANCELLED)
      if (ticket.status === "CANCELLED") {
        await tx.ticketScan.create({
          data: {
            eventId: event.id,
            ticketId: ticket.id,
            staffId,
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
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
          },
        };
      }

      // Case 6e: CHECK_IN action
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
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: "INSIDE" as const,
          },
        };
      }

      // Case 6f: CHECK_OUT action
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
          ticket: {
            ticketNumber: ticket.ticketNumber,
            status: "OUTSIDE" as const,
          },
        };
      }

      throw new Error("UNHANDLED_ACTION");
    });

    return jsonResponse(result, { status: 200 });
  } catch {
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
