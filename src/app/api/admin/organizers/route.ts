import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, hashPassword } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const organizers = await prisma.user.findMany({
      where: { role: "ORGANIZER" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        events: {
          select: {
            id: true,
            name: true,
            status: true,
            eventDate: true,
            venue: true,
          },
          orderBy: { eventDate: "desc" },
        },
        _count: {
          select: {
            events: true,
            scans: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = organizers.map((org) => ({
      ...org,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      events: org.events.map((e) => ({
        ...e,
        eventDate: e.eventDate.toISOString().split("T")[0],
      })),
    }));

    return NextResponse.json({ organizers: formatted }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงรายชื่อผู้จัดงานได้" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { name, email, password } = body;

    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      return NextResponse.json(
        { error: { message: "กรุณากรอกชื่อ-นามสกุล, อีเมล และรหัสผ่านให้ครบถ้วน" } },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: { message: "รูปแบบอีเมลไม่ถูกต้อง" } },
        { status: 400 },
      );
    }

    if (trimmedPassword.length < 6) {
      return NextResponse.json(
        { error: { message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" } },
        { status: 400 },
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { message: `อีเมล "${trimmedEmail}" ถูกใช้งานแล้วในระบบ` } },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(trimmedPassword);

    const newOrganizer = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        passwordHash,
        role: "ORGANIZER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, organizer: newOrganizer, message: "สร้างบัญชีผู้ดูแลคอนเสิร์ตสำเร็จ" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create organizer:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถสร้างบัญชีผู้ดูแลคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
