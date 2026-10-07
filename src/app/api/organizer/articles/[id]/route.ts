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
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
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

    // AC-20: Forbidden if attempting to access another Organizer's article
    if (article.authorId !== auth.session.sub) {
      return NextResponse.json(
        { error: { message: "คุณไม่มีสิทธิ์เข้าถึงบทความนี้" } },
        { status: 403 },
      );
    }

    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    console.error("Failed to get organizer article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงข้อมูลบทความได้" } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
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
        { error: { message: "ไม่พบบทความที่ต้องการแก้ไข" } },
        { status: 404 },
      );
    }

    // AC-20: Forbidden if attempting to edit another Organizer's article
    if (existing.authorId !== auth.session.sub) {
      return NextResponse.json(
        { error: { message: "คุณไม่มีสิทธิ์แก้ไขบทความนี้" } },
        { status: 403 },
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
      submitForReview,
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

    // AC-19: Organizer edit on PUBLISHED article automatically reverts to PENDING_REVIEW
    let newStatus = existing.status;
    if (existing.status === "PUBLISHED") {
      newStatus = "PENDING_REVIEW";
    } else if (submitForReview) {
      newStatus = "PENDING_REVIEW";
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
        status: newStatus,
        ...(tagConnectPayload ? { tags: tagConnectPayload } : {}),
        ...(eventConnectPayload ? { events: eventConnectPayload } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        events: { select: { id: true, name: true, eventDate: true } },
      },
    });

    return NextResponse.json({ success: true, article: updated }, { status: 200 });
  } catch (error) {
    console.error("Failed to update organizer article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถบันทึกการแก้ไขบทความได้" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request, ["ORGANIZER"]);
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

    // AC-20: Forbidden if attempting to delete another Organizer's article
    if (existing.authorId !== auth.session.sub) {
      return NextResponse.json(
        { error: { message: "คุณไม่มีสิทธิ์ลบบทความนี้" } },
        { status: 403 },
      );
    }

    // AC-21: Organizer can only delete DRAFT articles
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: {
            message: "ผู้จัดงานสามารถลบได้เฉพาะบทความที่เป็นแบบร่าง (Draft) เท่านั้น หากต้องการลบบทความที่เผยแพร่แล้วกรุณาติดต่อผู้ดูแลระบบ (Admin)",
          },
        },
        { status: 400 },
      );
    }

    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: "ลบบทความเรียบร้อยแล้ว" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete organizer article:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถลบบทความได้" } },
      { status: 500 },
    );
  }
}
