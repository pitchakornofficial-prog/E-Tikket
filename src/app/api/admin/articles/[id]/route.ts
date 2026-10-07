import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function sanitizeSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        events: { select: { id: true, name: true, eventDate: true } },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: { message: "ไม่พบบทความที่ระบุ" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    console.error("Failed to get article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงข้อมูลบทความได้" } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existing = await prisma.article.findUnique({
      where: { id },
      include: { tags: true, events: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "ไม่พบบทความที่ต้องการแก้ไข" } },
        { status: 404 },
      );
    }

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
      tagNames,
      eventIds,
      status: requestedStatus,
    } = body;

    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        { error: { message: "หัวข้อบทความต้องไม่ว่างเปล่า" } },
        { status: 400 },
      );
    }

    if (content !== undefined && (!content || !content.trim())) {
      return NextResponse.json(
        { error: { message: "เนื้อหาบทความต้องไม่ว่างเปล่า" } },
        { status: 400 },
      );
    }

    // Slug validation and uniqueness (AC-22)
    let finalSlug = existing.slug;
    if (slug && typeof slug === "string") {
      finalSlug = sanitizeSlug(slug);
      if (finalSlug !== existing.slug) {
        const slugConflict = await prisma.article.findUnique({
          where: { slug: finalSlug },
        });
        if (slugConflict) {
          return NextResponse.json(
            { error: { message: "Slug นี้มีบทความใช้งานแล้ว กรุณาระบุ slug อื่น" } },
            { status: 400 },
          );
        }
      }
    }

    // Category validation
    let finalCategoryId = existing.categoryId;
    if (categoryId && typeof categoryId === "string") {
      const category = await prisma.articleCategory.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: { message: "ไม่พบหมวดหมู่ที่ระบุ" } },
          { status: 400 },
        );
      }
      finalCategoryId = category.id;
    }

    // AC-09: Admin editing any published article keeps it PUBLISHED unless explicitly changed
    let finalStatus = existing.status;
    let publishedAt = existing.publishedAt;
    if (requestedStatus) {
      finalStatus = requestedStatus;
      if (requestedStatus === "PUBLISHED" && !publishedAt) {
        publishedAt = new Date();
      }
    }

    // Handle tags update if provided
    let tagConnectPayload: { set: { id: string }[] } | undefined = undefined;
    if (tagNames !== undefined && Array.isArray(tagNames)) {
      const tagConnects: { id: string }[] = [];
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
      tagConnectPayload = { set: tagConnects };
    }

    // Handle events update if provided
    let eventConnectPayload: { set: { id: string }[] } | undefined = undefined;
    if (eventIds !== undefined && Array.isArray(eventIds)) {
      eventConnectPayload = {
        set: eventIds.map((eventId: string) => ({ id: eventId })),
      };
    }

    const updated = await prisma.article.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        slug: finalSlug,
        content: content !== undefined ? content.trim() : existing.content,
        excerpt: excerpt !== undefined ? excerpt?.trim() || null : existing.excerpt,
        coverImageUrl:
          coverImageUrl !== undefined ? coverImageUrl?.trim() || null : existing.coverImageUrl,
        seoTitle: seoTitle !== undefined ? seoTitle?.trim() || null : existing.seoTitle,
        seoDescription:
          seoDescription !== undefined ? seoDescription?.trim() || null : existing.seoDescription,
        ogImageUrl:
          ogImageUrl !== undefined ? ogImageUrl?.trim() || null : existing.ogImageUrl,
        categoryId: finalCategoryId,
        status: finalStatus,
        publishedAt,
        ...(tagConnectPayload ? { tags: tagConnectPayload } : {}),
        ...(eventConnectPayload ? { events: eventConnectPayload } : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        events: { select: { id: true, name: true, eventDate: true } },
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
    console.error("Failed to update article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถบันทึกการแก้ไขบทความได้" } },
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
    const existing = await prisma.article.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "ไม่พบบทความที่ต้องการลบ" } },
        { status: 404 },
      );
    }

    // AC-14: Admin can delete any article
    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "ลบบทความเรียบร้อยแล้ว",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถลบบทความได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
