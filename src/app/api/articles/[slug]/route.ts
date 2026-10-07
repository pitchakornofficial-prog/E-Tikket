import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: { message: "Article not found" } }, { status: 404 });
  }

  try {
    const article = await prisma.article.findFirst({
      where: {
        slug: slug.toLowerCase(),
        status: "PUBLISHED", // AC-06: Only PUBLISHED articles accessible publicly
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        events: {
          where: { status: "PUBLISHED" },
          select: {
            id: true,
            name: true,
            venue: true,
            eventDate: true,
            startTime: true,
            ticketPrice: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!article) {
      // AC-06: 404 for non-existent or non-published
      return NextResponse.json(
        { error: { message: "Article not found or not published" } },
        { status: 404 },
      );
    }

    // SEO fallback values calculation (AC-23, AC-24)
    const effectiveSeoTitle = article.seoTitle || article.title;
    const effectiveSeoDescription =
      article.seoDescription || article.excerpt || article.content.slice(0, 160).trim();
    const effectiveOgImage = article.ogImageUrl || article.coverImageUrl;

    return NextResponse.json(
      {
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          content: article.content,
          excerpt: article.excerpt,
          coverImageUrl: article.coverImageUrl,
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          ogImageUrl: article.ogImageUrl,
          effectiveSeoTitle,
          effectiveSeoDescription,
          effectiveOgImage,
          publishedAt: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
          createdAt: article.createdAt.toISOString(),
          author: article.author,
          category: article.category,
          tags: article.tags,
          events: article.events.map((ev) => ({
            ...ev,
            ticketPrice: ev.ticketPrice.toFixed(2),
            eventDate: ev.eventDate.toISOString().split("T")[0],
          })),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Failed to get public article:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch article" } },
      { status: 500 },
    );
  }
}
