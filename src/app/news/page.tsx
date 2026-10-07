import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicNavbar } from "@/components/public-navbar";
import { CalendarIcon, UserIcon, ChevronLeftIcon, ChevronRightIcon, XIcon, SlidersIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "ข่าวสารและบทความดนตรี | TICKETBOX",
  description: "อัปเดตข่าวสารคอนเสิร์ต บทสัมภาษณ์ศิลปิน และเรื่องราวดนตรีอินดี้ล่าสุดในประเทศไทย",
  openGraph: {
    title: "ข่าวสารและบทความดนตรี | TICKETBOX",
    description: "อัปเดตข่าวสารคอนเสิร์ต บทสัมภาษณ์ศิลปิน และเรื่องราวดนตรีอินดี้ล่าสุดในประเทศไทย",
    type: "website",
  },
};

interface NewsPageProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    page?: string;
  }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { category: categorySlug, tag: tagSlug, page: pageStr } = await searchParams;

  const page = Math.max(1, parseInt(pageStr || "1", 10));
  const limit = 9;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {
    status: "PUBLISHED",
  };

  if (categorySlug) {
    whereClause.category = {
      slug: categorySlug.toLowerCase(),
    };
  }

  if (tagSlug) {
    whereClause.tags = {
      some: {
        slug: tagSlug.toLowerCase(),
      },
    };
  }

  const [articles, totalArticles, categories, popularTags] = await Promise.all([
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
      take: 12,
    }),
  ]);

  const totalPages = Math.ceil(totalArticles / limit) || 1;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans flex flex-col transition-colors duration-200">
      <PublicNavbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full">
        {/* Hero Section */}
        <div className="mb-10 text-center max-w-2xl mx-auto space-y-2">
          <p className="text-xs font-mono tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
            News & Music Stories
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white uppercase">
            ข่าวสารและเรื่องราวดนตรี
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            เจาะลึกบทความ รีวิวคอนเสิร์ต และเกร็ดดนตรีอินดี้จากผู้จัดงานและทีมงาน TICKETBOX
          </p>
        </div>

        {/* Filter Controls (AC-03, AC-04) */}
        <div className="mb-8 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/news"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !categorySlug
                  ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                  : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
              }`}
            >
              ทั้งหมด
            </Link>
            {categories.map((cat) => {
              const isSelected = categorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/news?category=${cat.slug}${tagSlug ? `&tag=${tagSlug}` : ""}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                      : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>

          {/* Active Tag filter indicator */}
          {tagSlug && (
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">กำลังกรองตามแท็ก:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono border border-neutral-300 dark:border-neutral-700">
                #{tagSlug}
                <Link
                  href={`/news${categorySlug ? `?category=${categorySlug}` : ""}`}
                  className="hover:text-red-500"
                  title="ยกเลิกการกรองแท็ก"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </Link>
              </span>
            </div>
          )}
        </div>

        {/* Article Grid (AC-02) */}
        {articles.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-white/60 dark:bg-neutral-950/60 border border-neutral-300 dark:border-neutral-900 rounded-lg">
            <SlidersIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-600 mx-auto" />
            <p className="text-base text-neutral-800 dark:text-neutral-300 font-semibold">ไม่พบบทความที่ตรงกับการค้นหา</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {categorySlug || tagSlug
                ? "ลองเปลี่ยนตัวกรองหมวดหมู่หรือแท็กเพื่อค้นหาบทความอื่น"
                : "ขณะนี้ยังไม่มีบทความที่เผยแพร่ โปรดกลับมาติดตามใหม่เร็วๆ นี้"}
            </p>
            {(categorySlug || tagSlug) && (
              <Link
                href="/news"
                className="inline-block mt-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white text-xs font-medium rounded transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <article
                key={art.id}
                className="flex flex-col rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors group shadow-sm hover:shadow-md"
              >
                {/* Cover Image */}
                <Link href={`/news/${art.slug}`} className="block relative aspect-video bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                  {art.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={art.coverImageUrl}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950 text-neutral-500 dark:text-neutral-700 font-mono text-xs">
                      TICKETBOX NEWS
                    </div>
                  )}
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold bg-white/90 dark:bg-black/80 backdrop-blur text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    {art.category.name}
                  </span>
                </Link>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Date and Author */}
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                        {new Date(art.publishedAt || art.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <UserIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                        {art.author.name}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-black dark:group-hover:text-neutral-200 line-clamp-2 leading-snug">
                      <Link href={`/news/${art.slug}`}>{art.title}</Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                      {art.excerpt || art.content.slice(0, 140) + "..."}
                    </p>
                  </div>

                  {/* Tags (AC-30) */}
                  {art.tags.length > 0 && (
                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-900 flex flex-wrap gap-1.5">
                      {art.tags.slice(0, 3).map((tag) => (
                        <Link
                          key={tag.id}
                          href={`/news?tag=${tag.slug}`}
                          className="text-[10px] font-mono text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                        >
                          #{tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link
                href={`/news?page=${page - 1}${categorySlug ? `&category=${categorySlug}` : ""}${
                  tagSlug ? `&tag=${tagSlug}` : ""
                }`}
                className="p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Link>
            ) : (
              <span className="p-2 rounded bg-neutral-950 border border-neutral-900 text-neutral-600 cursor-not-allowed">
                <ChevronLeftIcon className="w-4 h-4" />
              </span>
            )}

            <span className="px-4 py-2 text-xs font-mono text-neutral-400">
              หน้า {page} จาก {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={`/news?page=${page + 1}${categorySlug ? `&category=${categorySlug}` : ""}${
                  tagSlug ? `&tag=${tagSlug}` : ""
                }`}
                className="p-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
                title="หน้าถัดไป"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
            ) : (
              <span className="p-2 rounded bg-neutral-950 border border-neutral-900 text-neutral-600 cursor-not-allowed">
                <ChevronRightIcon className="w-4 h-4" />
              </span>
            )}
          </div>
        )}

        {/* Popular Tags Footer Strip */}
        {popularTags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-neutral-900 text-center space-y-3">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
              แท็กยอดนิยม (Popular Tags)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {popularTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/news?tag=${tag.slug}`}
                  className="px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600 font-mono mt-16">
        <p>E-Tikket News & Articles • TICKETBOX MVP</p>
      </footer>
    </div>
  );
}
