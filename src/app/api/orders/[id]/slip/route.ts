import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hashToken, hashBuffer, generateSecureToken } from "@/lib/crypto";
import { putPrivateArtifact, deletePrivateArtifact } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes (5 MB)

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

function isValidJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isValidPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  // 1. Extract capability token from Bearer header or query parameter
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

  // 2. Fetch order to verify existence and capability match
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order || order.checkoutTokenHash !== tokenHash) {
    return uniformNotFound();
  }

  const now = new Date();

  // 3. Check order status and expiry
  if (order.status !== "PENDING_PAYMENT") {
    const response = NextResponse.json(
      {
        error: {
          code: order.status === "EXPIRED" ? "ORDER_EXPIRED" : "INVALID_ORDER_STATE",
          message:
            order.status === "EXPIRED"
              ? "คำสั่งซื้อหมดเวลา 15 นาทีแล้ว"
              : "คำสั่งซื้อไม่อยู่ในสถานะที่สามารถส่งสลิปได้",
        },
        orderStatus: order.status,
      },
      { status: 409 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  if (now > order.expiresAt) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "EXPIRED" },
    });

    const response = NextResponse.json(
      {
        error: {
          code: "ORDER_EXPIRED",
          message: "คำสั่งซื้อหมดเวลา 15 นาทีแล้ว",
        },
        orderStatus: "EXPIRED",
      },
      { status: 409 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // 4. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    const response = NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "ข้อมูลที่ส่งมาไม่ถูกต้อง (ต้องการ multipart/form-data)",
        },
      },
      { status: 422 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    const response = NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "กรุณาแนบไฟล์สลิปหลักฐานการโอนเงิน",
        },
      },
      { status: 422 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // Convert Blob to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // 5. File size validation (limit to 5,242,880 bytes)
  if (fileBuffer.length > MAX_FILE_SIZE) {
    const response = NextResponse.json(
      {
        error: {
          code: "FILE_TOO_LARGE",
          message: "ขนาดไฟล์สลิปเกินขีดจำกัด 5 MB",
        },
      },
      { status: 413 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // 6. Decode and validate file bytes (genuine JPEG or PNG)
  let extension = "";
  let mimeType = "";
  if (isValidJpeg(fileBuffer)) {
    extension = "jpg";
    mimeType = "image/jpeg";
  } else if (isValidPng(fileBuffer)) {
    extension = "png";
    mimeType = "image/png";
  } else {
    const response = NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED_FILE_TYPE",
          message: "รองรับเฉพาะไฟล์รูปภาพ JPEG หรือ PNG เท่านั้น",
        },
      },
      { status: 415 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // 7. Calculate SHA-256 slip hash and check for duplicates
  const slipHash = hashBuffer(fileBuffer);
  const existingPayment = await prisma.payment.findUnique({
    where: { slipHash },
  });

  if (existingPayment) {
    const response = NextResponse.json(
      {
        error: {
          code: "DUPLICATE_SLIP",
          message: "สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้",
        },
      },
      { status: 409 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // 8. Store slip bytes privately in R2
  const artifactKey = `slips/${order.id}/${Date.now()}-${generateSecureToken(8)}.${extension}`;
  try {
    await putPrivateArtifact(artifactKey, fileBuffer, mimeType);
  } catch {
    const response = NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ระบบบันทึกไฟล์ชั่วคราวขัดข้อง กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  // 9. Atomic database transaction
  try {
    await prisma.$transaction(async (tx) => {
      // Re-verify eligibility within transaction
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
      });

      if (!currentOrder || currentOrder.status !== "PENDING_PAYMENT" || new Date() > currentOrder.expiresAt) {
        throw new Error("ORDER_NO_LONGER_ELIGIBLE");
      }

      await tx.payment.create({
        data: {
          orderId: currentOrder.id,
          amount: currentOrder.totalAmount,
          slipUrl: artifactKey,
          slipHash,
          status: "PENDING",
        },
      });

      await tx.order.update({
        where: { id: currentOrder.id },
        data: {
          status: "WAITING_FOR_VERIFY",
        },
      });
    });

    const response = NextResponse.json(
      {
        success: true,
        orderStatus: "WAITING_FOR_VERIFY",
      },
      { status: 200 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    // Best-effort cleanup of orphan unreferenced R2 object
    try {
      await deletePrivateArtifact(artifactKey);
    } catch {
      // Ignore cleanup error
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const response = NextResponse.json(
        {
          error: {
            code: "DUPLICATE_SLIP",
            message: "สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้",
          },
        },
        { status: 409 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }

    if (error instanceof Error && error.message === "ORDER_NO_LONGER_ELIGIBLE") {
      const response = NextResponse.json(
        {
          error: {
            code: "ORDER_EXPIRED",
            message: "คำสั่งซื้อหมดเวลา 15 นาทีแล้ว",
          },
          orderStatus: "EXPIRED",
        },
        { status: 409 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }

    const response = NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ไม่สามารถบันทึกข้อมูลการโอนเงินได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        },
      },
      { status: 503 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
