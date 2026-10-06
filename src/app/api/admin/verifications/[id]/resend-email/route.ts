import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import {
  dispatchTicketDelivery,
  DeliveryInProgressError,
} from "@/lib/ticket-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  // 1. Authorize ADMIN role
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  // 2. Locate order
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      tickets: { select: { id: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      {
        error: {
          code: "ORDER_NOT_FOUND",
          message: "ไม่พบคำสั่งซื้อที่ระบุ",
        },
      },
      { status: 404 },
    );
  }

  // 3. Must be PAID order with PENDING or FAILED delivery
  if (order.status !== "PAID") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ORDER_STATE",
          message: "สามารถส่งอีเมลซ้ำได้เฉพาะคำสั่งซื้อที่ชำระเงินและออกตั๋วแล้วเท่านั้น",
        },
      },
      { status: 409 },
    );
  }

  // 4. Attempt delivery dispatch
  try {
    const deliveryResult = await dispatchTicketDelivery(order.id, prisma);

    if (deliveryResult.success) {
      return NextResponse.json(
        {
          orderStatus: "PAID",
          deliveryStatus: "SENT",
          ticketsCreated: 0,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          error: {
            code: "DELIVERY_FAILED",
            message: deliveryResult.error || "ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
          },
          orderStatus: "PAID",
          deliveryStatus: "FAILED",
          ticketsCreated: 0,
        },
        { status: 503 },
      );
    }
  } catch (error) {
    if (error instanceof DeliveryInProgressError) {
      return NextResponse.json(
        {
          error: {
            code: "DELIVERY_IN_PROGRESS",
            message: "กำลังดำเนินการส่งอีเมลสำหรับคำสั่งซื้อนี้อยู่แล้ว กรุณารอสักครู่",
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "DELIVERY_FAILED",
          message: "ระบบขัดข้องในการจัดส่งอีเมล กรุณาลองใหม่อีกครั้ง",
        },
        orderStatus: "PAID",
        deliveryStatus: "FAILED",
        ticketsCreated: 0,
      },
      { status: 503 },
    );
  }
}
