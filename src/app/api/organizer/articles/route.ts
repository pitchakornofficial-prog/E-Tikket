import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

function sanitizeSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const articles = await prisma.article.findMany({
      where: { authorId: auth.session.sub },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        events: { select: { id: true, name: true, eventDate: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error) {
    console.error("Failed to list organizer articles:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงข้อมูลบทความได้" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      coverImageUrl,
      seoTitle,
      seoDescription,
      ogImageUrl,
      categoryId,
      tagNames = [],
      eventIds = [],
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: { message: "กรุณาระบุหัวข้อบทความ" } },
        { status: 400 },
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: { message: "กรุณาระบุเนื้อหาบทความ" } },
        { status: 400 },
      );
    }

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { error: { message: "กรุณาเลือกหมวดหมู่บทความ" } },
        { status: 400 },
      );
    }

    const category = await prisma.articleCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: { message: "ไม่พบหมวดหมู่ที่ระบุ" } },
        { status: 400 },
      );
    }

    // Slug validation and uniqueness (AC-22)
    const rawSlug = slug && typeof slug === "string" && slug.trim() ? slug : title;
    const finalSlug = sanitizeSlug(rawSlug);

    if (!finalSlug) {
      return NextResponse.json(
        { error: { message: "กรุณาระบุ slug สำหรับบทความ" } },
        { status: 400 },
      );
    }

    const existingSlug = await prisma.article.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: { message: "Slug นี้มีบทความใช้งานแล้ว กรุณาระบุ slug อื่น" } },
        { status: 400 },
      );
    }

    // Tags upsert
    const tagConnects: { id: string }[] = [];
    if (Array.isArray(tagNames)) {
      for (const rawTagName of tagNames) {
        const trimmed = String(rawTagName).trim();
        if (!trimmed) continue;
        const tagSlug = sanitizeSlug(trimmed);
        if (!tagSlug) continue;

        const tag = await prisma.articleTag.upsert({
          where: { slug: tagSlug },
          create: { name: trimmed, slug: tagSlug },
          update: { name: trimmed },
        });
        tagConnects.push({ id: tag.id });
      }
    }

    // Events connection
    const eventConnects: { id: string }[] = [];
    if (Array.isArray(eventIds)) {
      for (const id of eventIds) {
        if (typeof id === "string" && id.trim()) {
          eventConnects.push({ id: id.trim() });
        }
      }
    }

    // AC-17: Organizer created article is always DRAFT
    const article = await prisma.article.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        content: content.trim(),
        excerpt: excerpt?.trim() || null,
        coverImageUrl: coverImageUrl?.trim() || null,
        seoTitle: seoTitle?.trim() || null,
        seoDescription: seoDescription?.trim() || null,
        ogImageUrl: ogImageUrl?.trim() || null,
        status: "DRAFT",
        authorId: auth.session.sub,
        categoryId: category.id,
        tags: { connect: tagConnects },
        events: { connect: eventConnects },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        events: { select: { id: true, name: true, eventDate: true } },
      },
    });

    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (error) {
    console.error("Failed to create organizer article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถสร้างบทความได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
