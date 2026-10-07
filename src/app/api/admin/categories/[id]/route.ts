import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

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
    const existing = await prisma.articleCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "ไม่พบหมวดหมู่ที่ต้องการแก้ไข" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: { message: "กรุณาระบุชื่อหมวดหมู่" } },
        { status: 400 },
      );
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json(
        { error: { message: "กรุณาระบุ slug สำหรับหมวดหมู่" } },
        { status: 400 },
      );
    }

    const cleanSlug = slug.trim().toLowerCase();

    if (cleanSlug !== existing.slug) {
      const slugConflict = await prisma.articleCategory.findUnique({
        where: { slug: cleanSlug },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: { message: "Slug นี้มีอยู่ในระบบแล้ว กรุณาใช้ slug อื่น" } },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.articleCategory.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: cleanSlug,
      },
    });

    return NextResponse.json(
      {
        success: true,
        category: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          articleCount: existing._count.articles,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update article category:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถแก้ไขหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง" } },
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
    const category = await prisma.articleCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: { message: "ไม่พบหมวดหมู่ที่ต้องการลบ" } },
        { status: 404 },
      );
    }

    // AC-16: Prevent deletion if articles are associated
    if (category._count.articles > 0) {
      return NextResponse.json(
        {
          error: {
            message: `ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากมีบทความที่เชื่อมโยงอยู่ (${category._count.articles} บทความ) กรุณาย้ายบทความไปยังหมวดหมู่อื่นก่อน`,
          },
        },
        { status: 400 },
      );
    }

    await prisma.articleCategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: "ลบหมวดหมู่สำเร็จ" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete article category:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถลบหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
