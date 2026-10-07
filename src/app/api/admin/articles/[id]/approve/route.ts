import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ADMIN"]);
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

    // AC-11: Admin approves PENDING_REVIEW -> PUBLISHED
    const updated = await prisma.article.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
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
    console.error("Failed to approve article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถอนุมัติบทความได้" } },
      { status: 500 },
    );
  }
}
