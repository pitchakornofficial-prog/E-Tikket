import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import {
  prepareTicketArtifacts,
  issueTicketsInTransaction,
  dispatchTicketDelivery,
  PreparedIssuance,
} from "@/lib/ticket-service";

import { deletePrivateArtifacts } from "@/lib/storage";

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

  // Idempotent repeated approval: return existing count and delivery state without extra tickets
  if (order.status === "PAID") {
    return NextResponse.json(
      {
        success: true,
        orderStatus: "PAID",
        ticketsCreated: order.tickets.length,
        deliveryStatus: order.deliveryStatus,
      },
      { status: 200 },
    );
  }

  if (order.status !== "WAITING_FOR_VERIFY") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ORDER_STATE",
          message: "คำสั่งซื้อไม่อยู่ในสถานะที่สามารถอนุมัติได้",
        },
      },
      { status: 409 },
    );
  }

  // 2. Prepare artifacts in Cloudflare R2 before database transaction
  let prepared: PreparedIssuance;
  try {
    prepared = await prepareTicketArtifacts(order.id, order.eventId, order.quantity);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "ISSUANCE_FAILED",
          message: "ระบบเตรียมข้อมูล QR Code และไฟล์ตั๋วขัดข้อง คำสั่งซื้อยังคงรอการตรวจสอบ",
        },
      },
      { status: 503 },
    );
  }

  const now = new Date();

  // 3. Commit within atomic transaction
  try {
    await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
      });

      if (!currentOrder || currentOrder.status !== "WAITING_FOR_VERIFY") {
        throw new Error("ORDER_STATE_CHANGED");
      }

      await issueTicketsInTransaction(tx, prepared, auth.session.sub, now);
    });

    // 4. Trigger initial ticket email dispatch after successful transaction commit
    let deliveryStatus: "PENDING" | "SENT" | "FAILED" = "PENDING";
    try {
      const deliveryResult = await dispatchTicketDelivery(order.id, prisma);
      deliveryStatus = deliveryResult.deliveryStatus;
    } catch {
      // Delivery failure never rolls back the approved PAID order or tickets
      deliveryStatus = "FAILED";
    }

    return NextResponse.json(
      {
        success: true,
        orderStatus: "PAID",
        ticketsCreated: order.quantity,
        deliveryStatus,
      },
      { status: 200 },
    );

  } catch (error) {
    // Best-effort cleanup of unreferenced prepared objects on transaction failure
    try {
      await deletePrivateArtifacts(prepared.allArtifactKeys);
    } catch {
      // Ignore cleanup error
    }

    if (error instanceof Error && error.message === "ORDER_STATE_CHANGED") {
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
          message: "ระบบไม่สามารถบันทึกการอนุมัติและออกตั๋วได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
  }
}
