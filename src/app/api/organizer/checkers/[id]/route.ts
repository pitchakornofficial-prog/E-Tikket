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
