import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { sendRejectionEmail } from "@/lib/email";

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

  let reason: string | null = null;
  try {
    const body = await request.json();
    if (body && typeof body.reason === "string") {
      reason = body.reason.trim();
    }
  } catch {
    // Empty body is explicitly allowed by spec
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      event: { select: { name: true } },
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

  // Idempotent repeated rejection: return existing state without repeating notification
  if (order.status === "REJECTED") {
    return NextResponse.json(
      {
        success: true,
        orderStatus: "REJECTED",
        notificationStatus: "SENT",
      },
      { status: 200 },
    );
  }

  if (order.status !== "WAITING_FOR_VERIFY") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ORDER_STATE",
          message: "คำสั่งซื้อไม่อยู่ในสถานะที่สามารถปฏิเสธได้",
        },
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const latestPayment = order.payments[0];

  try {
    await prisma.$transaction(async (tx) => {
      // Recheck status in transaction for concurrency protection
      const currentOrder = await tx.order.findUnique({ where: { id: order.id } });
      if (!currentOrder || currentOrder.status !== "WAITING_FOR_VERIFY") {
        throw new Error("INVALID_STATE");
      }

      if (latestPayment) {
        await tx.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: "REJECTED",
            verifiedById: auth.session.sub,
            verifiedAt: now,
            rejectReason: reason,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            slipUrl: "",
            slipHash: `manual-reject-${order.id}-${now.getTime()}`,
            status: "REJECTED",
            verifiedById: auth.session.sub,
            verifiedAt: now,
            rejectReason: reason,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REJECTED",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STATE") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_ORDER_STATE",
            message: "สถานะคำสั่งซื้อเปลี่ยนแปลงไปแล้ว กรุณารีเฟรชเพื่อดูข้อมูลล่าสุด",
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ระบบไม่สามารถบันทึกการปฏิเสธได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
  }

  // 2. Attempt rejection notification after commit
  let notificationStatus: "SENT" | "FAILED" = "SENT";
  try {
    const emailResult = await sendRejectionEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderId: order.id,
      eventName: order.event.name,
      reason,
    });
    if (!emailResult.success) {
      notificationStatus = "FAILED";
    }
  } catch {
    notificationStatus = "FAILED";
  }

  return NextResponse.json(
    {
      success: true,
      orderStatus: "REJECTED",
      notificationStatus,
    },
    { status: 200 },
  );
}
