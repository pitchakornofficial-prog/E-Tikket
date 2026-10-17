import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  // 1. Authenticate staff (ORGANIZER only)
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const checker = await prisma.ticketChecker.findUnique({
      where: { id },
    });

    if (!checker) {
      return jsonResponse(
        { error: { message: "ไม่พบเจ้าหน้าที่ตรวจบัตรที่ต้องการลบ" } },
        { status: 404 },
      );
    }

    if (checker.organizerId !== auth.session.sub) {
      return jsonResponse(
        { error: { message: "คุณไม่มีสิทธิ์จัดการเจ้าหน้าที่คนนี้" } },
        { status: 403 },
      );
    }

    // Delete the checker (scans will have checkerId set to null, preserving checkerName)
    await prisma.ticketChecker.delete({
      where: { id },
    });

    return jsonResponse(
      {
        success: true,
        message: `ลบเจ้าหน้าที่ตรวจบัตร "${checker.name}" และยกเลิกสิทธิ์การเข้าถึงเรียบร้อยแล้ว`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete checker:", error);
    return jsonResponse(
      { error: { message: "ไม่สามารถลบเจ้าหน้าที่ตรวจบัตรได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  // 1. Authenticate staff (ORGANIZER only)
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const checker = await prisma.ticketChecker.findUnique({
      where: { id },
    });

    if (!checker) {
      return jsonResponse(
        { error: { message: "ไม่พบเจ้าหน้าที่ตรวจบัตรที่ต้องการแก้ไข" } },
        { status: 404 },
      );
    }

    if (checker.organizerId !== auth.session.sub) {
      return jsonResponse(
        { error: { message: "คุณไม่มีสิทธิ์จัดการเจ้าหน้าที่คนนี้" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { isActive, gateNote, name, phone, pin } = body;

    const updated = await prisma.ticketChecker.update({
      where: { id },
      data: {
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(typeof gateNote === "string" ? { gateNote: gateNote.trim() } : {}),
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        ...(typeof phone === "string" ? { phone: phone.trim() } : {}),
        ...(typeof pin === "string" && pin.trim().length === 4 ? { pin: pin.trim() } : {}),
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            venue: true,
          },
        },
        _count: {
          select: {
            scans: true,
          },
        },
      },
    });

    return jsonResponse(
      {
        success: true,
        checker: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone || null,
          pin: updated.pin || null,
          gateNote: updated.gateNote,
          accessToken: updated.accessToken,
          isActive: updated.isActive,
          createdAt: updated.createdAt.toISOString(),
          eventId: updated.eventId,
          event: {
            id: updated.event.id,
            name: updated.event.name,
            eventDate: updated.event.eventDate.toISOString().split("T")[0],
            venue: updated.event.venue,
          },
          scansCount: updated._count.scans,
        },
        message: updated.isActive
          ? `เปิดใช้งานสิทธิ์เจ้าหน้าที่ "${updated.name}" เรียบร้อยแล้ว`
          : `ระงับสิทธิ์การใช้งานเจ้าหน้าที่ "${updated.name}" เรียบร้อยแล้ว ลิงก์จะไม่สามารถใช้งานได้`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update checker:", error);
    return jsonResponse(
      { error: { message: "ไม่สามารถแก้ไขข้อมูลเจ้าหน้าที่ตรวจบัตรได้" } },
      { status: 500 },
    );
  }
}

