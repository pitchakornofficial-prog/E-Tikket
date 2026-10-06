import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function uniformNotFound() {
  const response = NextResponse.json(
    {
      error: {
        code: "ORDER_NOT_FOUND",
        message: "ไม่พบคำสั่งซื้อ หรือไม่มีสิทธิ์เข้าถึง",
      },
    },
    { status: 404 },
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Extract capability token from Bearer header or query parameter
  let token: string | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get("token");
  }

  if (!token || token.length < 16) {
    return uniformNotFound();
  }

  const tokenHash = hashToken(token);

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            eventDate: true,
            startTime: true,
            venue: true,
            ticketPrice: true,
          },
        },
      },
    });

    // Capability mismatch or order not found -> uniform 404 denial
    if (!order || order.checkoutTokenHash !== tokenHash) {
      return uniformNotFound();
    }

    // Idempotent expiry check: if PENDING_PAYMENT and past expiresAt, transition to EXPIRED
    const now = new Date();
    let currentStatus = order.status;
    if (order.status === "PENDING_PAYMENT" && now > order.expiresAt) {
      currentStatus = "EXPIRED";
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      });
    }

    const response = NextResponse.json({
      orderId: order.id,
      event: {
        id: order.event.id,
        name: order.event.name,
        imageUrl: order.event.imageUrl,
        eventDate: order.event.eventDate.toISOString(),
        startTime: order.event.startTime,
        venue: order.event.venue,
        ticketPrice: order.event.ticketPrice.toFixed(2),
      },
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      },
      quantity: order.quantity,
      totalAmount: order.totalAmount.toFixed(2),
      orderStatus: currentStatus,
      expiresAt: order.expiresAt.toISOString(),
      bankAccount: {
        bank: "กสิกรไทย (KBANK)",
        accountName: "บริษัท อี-ทิคเก็ต จำกัด",
        accountNumber: "123-4-56789-0",
      },
      transferQr: "/qr-transfer-sample.svg",
    });

    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ระบบไม่สามารถให้บริการได้ในขณะนี้",
        },
      },
      { status: 503 },
    );
  }
}
