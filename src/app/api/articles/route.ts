import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get("category")?.trim().toLowerCase();
  const tagSlug = url.searchParams.get("tag")?.trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
  const skip = (page - 1) * limit;

  try {
    const whereClause: Record<string, unknown> = {
      status: "PUBLISHED",
    };

    if (categorySlug) {
      whereClause.category = {
        slug: categorySlug,
      };
    }

    if (tagSlug) {
      whereClause.tags = {
        some: {
          slug: tagSlug,
        },
      };
    }

    const [articles, total, categories, tags] = await Promise.all([
      prisma.article.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { id: true, name: true, slug: true } },
          author: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.article.count({
        where: whereClause,
      }),
      prisma.articleCategory.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.articleTag.findMany({
        select: { id: true, name: true, slug: true },
        take: 20,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json(
      {
        articles: articles.map((art) => ({
          id: art.id,
          title: art.title,
          slug: art.slug,
          excerpt: art.excerpt || art.content.slice(0, 160) + "...",
          coverImageUrl: art.coverImageUrl,
          publishedAt: art.publishedAt ? art.publishedAt.toISOString() : art.createdAt.toISOString(),
          category: art.category,
          tags: art.tags,
          authorName: art.author.name,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        categories,
        tags,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch public articles:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงข้อมูลข่าวสารได้" } },
      { status: 500 },
    );
  }
}
