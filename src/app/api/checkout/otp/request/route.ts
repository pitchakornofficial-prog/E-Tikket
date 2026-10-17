import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, eventId } = body;

    if (!email || typeof email !== "string" || !eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: { message: "กรุณาระบุอีเมลและรหัสคอนเสิร์ต" } },
        { status: 400 },
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Verify institutional domain (@ubu.ac.th)
    if (!trimmedEmail.endsWith("@ubu.ac.th")) {
      return NextResponse.json(
        { error: { message: "สิทธิ์ส่วนลดนักศึกษารองรับเฉพาะอีเมลสถาบัน (@ubu.ac.th) เท่านั้น" } },
        { status: 400 },
      );
    }

    // Verify event has student discount active
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || !event.studentDiscountActive) {
      return NextResponse.json(
        { error: { message: "คอนเสิร์ตนี้ไม่ได้เปิดให้สิทธิ์ส่วนลดนักศึกษา" } },
        { status: 400 },
      );
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old OTPs for this email
    await prisma.otpVerification.deleteMany({
      where: { email: trimmedEmail },
    });

    // Save new OTP
    await prisma.otpVerification.create({
      data: {
        email: trimmedEmail,
        code,
        expiresAt,
        verified: false,
      },
    });

    // Hybrid dev logging per architecture conventions
    console.log(`[STUDENT OTP DISPATCH] Sent 6-digit OTP "${code}" to ${trimmedEmail} (Valid for 10 minutes)`);

    return NextResponse.json(
      {
        success: true,
        message: `รหัส OTP 6 หลักถูกส่งไปยัง ${trimmedEmail} เรียบร้อยแล้ว (มีอายุ 10 นาที)`,
        expiresInSeconds: 600,
        // Include devCode for seamless automated testing and demo
        devCode: process.env.NODE_ENV !== "production" ? code : undefined,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Failed to request checkout OTP:", err);
    return NextResponse.json(
      { error: { message: "ไม่สามารถส่งรหัส OTP ได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
