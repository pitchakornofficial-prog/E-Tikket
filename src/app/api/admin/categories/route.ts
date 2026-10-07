import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireStaff(request, ["ADMIN", "ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const categories = await prisma.articleCategory.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      articleCount: c._count.articles,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ categories: formatted }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch article categories:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงข้อมูลหมวดหมู่ได้" } },
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

    // Check slug uniqueness
    const existing = await prisma.articleCategory.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: { message: "Slug นี้มีอยู่ในระบบแล้ว กรุณาใช้ slug อื่น" } },
        { status: 400 },
      );
    }

    const category = await prisma.articleCategory.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
      },
    });

    return NextResponse.json(
      {
        success: true,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          articleCount: 0,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create article category:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถสร้างหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
