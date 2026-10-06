import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { calculateAvailableTickets } from "@/lib/inventory";

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

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true, totalTickets: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
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

  if (order.status !== "REJECTED") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ORDER_STATE",
          message: "เฉพาะคำสั่งซื้อที่เคยถูกปฏิเสธเท่านั้นที่สามารถดึงกลับมาตรวจสอบใหม่ได้",
        },
      },
      { status: 409 },
    );
  }

  // 2. Check if inventory still allows reopening this order
  const now = new Date();
  const availableInventory = await calculateAvailableTickets(
    order.eventId,
    order.event.totalTickets,
    now,
  );

  if (availableInventory < order.quantity) {
    return NextResponse.json(
      {
        error: {
          code: "INSUFFICIENT_INVENTORY",
          message: `ไม่สามารถนำกลับมาตรวจสอบได้ เนื่องจากบัตรคงเหลือในระบบไม่เพียงพอ (เหลือ ${availableInventory} ใบ, คำสั่งซื้อต้องการ ${order.quantity} ใบ)`,
        },
      },
      { status: 409 },
    );
  }

  const latestPayment = order.payments[0];

  try {
    await prisma.$transaction(async (tx) => {
      // Re-verify in transaction
      const currentOrder = await tx.order.findUnique({ where: { id: order.id } });
      if (!currentOrder || currentOrder.status !== "REJECTED") {
        throw new Error("ORDER_STATE_CHANGED");
      }

      if (latestPayment) {
        await tx.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: "PENDING",
            verifiedById: auth.session.sub,
            verifiedAt: now,
            rejectReason: null,
          },
        });
      }

      // Revert order back to WAITING_FOR_VERIFY and give 24-hour review window
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "WAITING_FOR_VERIFY",
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    });

    const response = NextResponse.json(
      {
        success: true,
        orderStatus: "WAITING_FOR_VERIFY",
        message: "ดึงคำสั่งซื้อกลับมาสู่สถานะรอตรวจสอบเรียบร้อยแล้ว",
      },
      { status: 200 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "ORDER_STATE_CHANGED") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "สถานะคำสั่งซื้อเปลี่ยนแปลงไปแล้ว กรุณารีเฟรชหน้านี้",
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "เกิดข้อผิดพลาดในการดึงคำสั่งซื้อกลับมาตรวจสอบ",
        },
      },
      { status: 500 },
    );
  }
}
