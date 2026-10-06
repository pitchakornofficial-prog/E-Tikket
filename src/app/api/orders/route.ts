import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateSecureToken, hashToken } from "@/lib/crypto";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-\s]{9,20}$/;

interface CreateOrderPayload {
  eventId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
}

function validatePayload(body: unknown): {
  valid: boolean;
  error?: string;
  fields?: string[];
  data?: CreateOrderPayload;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Invalid request payload" };
  }

  const p = body as Record<string, unknown>;
  const errors: string[] = [];

  const eventId = typeof p.eventId === "string" ? p.eventId.trim() : "";
  if (!eventId) errors.push("eventId");

  const customerName = typeof p.customerName === "string" ? p.customerName.trim() : "";
  if (!customerName || customerName.length > 200) errors.push("customerName");

  const customerEmail = typeof p.customerEmail === "string" ? p.customerEmail.trim().toLowerCase() : "";
  if (!customerEmail || customerEmail.length > 254 || !emailPattern.test(customerEmail)) {
    errors.push("customerEmail");
  }

  const customerPhone = typeof p.customerPhone === "string" ? p.customerPhone.trim() : "";
  if (!customerPhone || !phonePattern.test(customerPhone)) {
    errors.push("customerPhone");
  }

  const quantity = typeof p.quantity === "number" ? p.quantity : Number(p.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push("quantity");
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: "ข้อมูลการจองบัตรไม่ถูกต้อง",
      fields: errors,
    };
  }

  return {
    valid: true,
    data: {
      eventId,
      customerName,
      customerEmail,
      customerPhone,
      quantity,
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "รูปแบบข้อมูลไม่ถูกต้อง",
        },
      },
      { status: 422 },
    );
  }

  const validation = validatePayload(body);
  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error || "ข้อมูลการจองบัตรไม่ถูกต้อง",
          fields: validation.fields,
        },
      },
      { status: 422 },
    );
  }

  const { eventId, customerName, customerEmail, customerPhone, quantity } = validation.data;
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check published event existence
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event || event.status !== "PUBLISHED") {
        return { error: "EVENT_NOT_FOUND" as const };
      }

      // 2. Canonical inventory check
      const activeOrders = await tx.order.findMany({
        where: {
          eventId,
          OR: [
            { status: "PAID" },
            { status: "WAITING_FOR_VERIFY" },
            {
              status: "PENDING_PAYMENT",
              expiresAt: { gt: now },
            },
          ],
        },
        select: { quantity: true },
      });

      const consumed = activeOrders.reduce((sum, o) => sum + o.quantity, 0);
      const available = Math.max(0, event.totalTickets - consumed);

      if (quantity > available) {
        return { error: "INSUFFICIENT_INVENTORY" as const };
      }

      // 3. Compute price, platform fee (default 5.00%), and organizer revenue
      const totalAmount = new Prisma.Decimal(event.ticketPrice).mul(quantity);
      const platformFeePercent = new Prisma.Decimal(5.0);
      const platformFeeAmount = totalAmount.mul(platformFeePercent).div(100);
      const organizerRevenue = totalAmount.sub(platformFeeAmount);

      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute reservation
      const checkoutToken = generateSecureToken(32);
      const checkoutTokenHash = hashToken(checkoutToken);

      const newOrder = await tx.order.create({
        data: {
          eventId: event.id,
          customerName,
          customerEmail,
          customerPhone,
          quantity,
          totalAmount,
          platformFeePercent,
          platformFeeAmount,
          organizerRevenue,
          checkoutTokenHash,
          status: "PENDING_PAYMENT",
          expiresAt,
        },
      });

      return { order: newOrder, checkoutToken };
    });

    if ("error" in result) {
      if (result.error === "EVENT_NOT_FOUND") {
        return NextResponse.json(
          {
            error: {
              code: "EVENT_NOT_FOUND",
              message: "ไม่พบงานแสดงที่เลือก หรือยังไม่เปิดให้จองบัตร",
            },
          },
          { status: 404 },
        );
      }
      if (result.error === "INSUFFICIENT_INVENTORY") {
        return NextResponse.json(
          {
            error: {
              code: "INSUFFICIENT_INVENTORY",
              message: "จำนวนบัตรคงเหลือไม่เพียงพอสำหรับการจอง",
            },
          },
          { status: 409 },
        );
      }
    }

    const { order, checkoutToken } = result;

    return NextResponse.json(
      {
        orderId: order.id,
        checkoutToken,
        checkoutUrl: `/checkout/${order.id}?token=${checkoutToken}`,
        orderStatus: "PENDING_PAYMENT",
        totalAmount: order.totalAmount.toFixed(2),
        expiresAt: order.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ระบบไม่สามารถดำเนินการจองบัตรได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
  }
}
