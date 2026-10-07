import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, hashPassword } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existingOrganizer = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingOrganizer || existingOrganizer.role !== "ORGANIZER") {
      return NextResponse.json(
        { error: { message: "ไม่พบบัญชีผู้ดูแลคอนเสิร์ตที่ต้องการแก้ไข" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();

    if (!trimmedName || !trimmedEmail) {
      return NextResponse.json(
        { error: { message: "กรุณาระบุชื่อ-นามสกุลและอีเมล" } },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: { message: "รูปแบบอีเมลไม่ถูกต้อง" } },
        { status: 400 },
      );
    }

    // Check if email changed and is taken
    if (trimmedEmail !== existingOrganizer.email) {
      const emailUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (emailUser && emailUser.id !== id) {
        return NextResponse.json(
          { error: { message: `อีเมล "${trimmedEmail}" มีผู้ใช้งานอื่นใช้อยู่แล้ว` } },
          { status: 409 },
        );
      }
    }

    const updateData: { name: string; email: string; passwordHash?: string } = {
      name: trimmedName,
      email: trimmedEmail,
    };

    if (trimmedPassword) {
      if (trimmedPassword.length < 6) {
        return NextResponse.json(
          { error: { message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" } },
          { status: 400 },
        );
      }
      updateData.passwordHash = await hashPassword(trimmedPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { success: true, organizer: updatedUser, message: "อัปเดตข้อมูลผู้ดูแลคอนเสิร์ตเรียบร้อยแล้ว" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update organizer:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถบันทึกข้อมูลผู้ดูแลคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existingOrganizer = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingOrganizer || existingOrganizer.role !== "ORGANIZER") {
      return NextResponse.json(
        { error: { message: "ไม่พบบัญชีผู้ดูแลคอนเสิร์ตที่ต้องการลบ" } },
        { status: 404 },
      );
    }

    // Check if organizer has assigned events
    const eventCount = await prisma.event.count({
      where: { organizerId: id },
    });

    if (eventCount > 0) {
      return NextResponse.json(
        {
          error: {
            message: `ไม่สามารถลบผู้ดูแล "${existingOrganizer.name}" ได้ เนื่องจากยังมีคอนเสิร์ตที่รับผิดชอบอยู่ (${eventCount} งาน) กรุณาเข้าไปที่เมนู "จัดการคอนเสิร์ต" เพื่อมอบหมายให้ผู้ดูแลคนอื่นก่อน`,
          },
        },
        { status: 400 },
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: `ลบบัญชีผู้ดูแล "${existingOrganizer.name}" ออกจากระบบเรียบร้อยแล้ว` },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete organizer:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถลบบัญชีผู้ดูแลคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
