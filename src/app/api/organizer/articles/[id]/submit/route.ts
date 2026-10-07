import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { error: { message: "ไม่พบบทความที่ระบุ" } },
        { status: 404 },
      );
    }

    // AC-20: Ownership verification
    if (article.authorId !== auth.session.sub) {
      return NextResponse.json(
        { error: { message: "คุณไม่มีสิทธิ์ส่งบทความนี้เพื่อตรวจสอบ" } },
        { status: 403 },
      );
    }

    if (!article.title.trim() || !article.content.trim()) {
      return NextResponse.json(
        { error: { message: "ไม่สามารถส่งบทความที่ไม่มีหัวข้อหรือไม่มีเนื้อหาได้" } },
        { status: 400 },
      );
    }

    // AC-18: Transitions DRAFT to PENDING_REVIEW
    const updated = await prisma.article.update({
      where: { id },
      data: {
        status: "PENDING_REVIEW",
      },
    });

    return NextResponse.json(
      {
        success: true,
        article: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to submit article for review:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถส่งบทความเพื่อตรวจสอบได้" } },
      { status: 500 },
    );
  }
}
