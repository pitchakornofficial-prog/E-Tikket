import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicNavbar } from "@/components/public-navbar";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  TicketIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@/components/icons";

interface ArticleDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: "PUBLISHED",
    },
    select: {
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      seoTitle: true,
      seoDescription: true,
      ogImageUrl: true,
    },
  });

  if (!article) {
    return {
      title: "ไม่พบบทความ | TICKETBOX",
      description: "ไม่พบเนื้อหาบทความที่คุณค้นหา",
    };
  }

  // AC-23, AC-24: Dynamic SEO metadata with fallbacks
  const title = article.seoTitle || `${article.title} | TICKETBOX`;
  const description =
    article.seoDescription ||
    article.excerpt ||
    article.content.slice(0, 160).replace(/\n/g, " ").trim();
  const ogImage = article.ogImageUrl || article.coverImageUrl;

  return {
    title,
    description,
    openGraph: {
      title: article.seoTitle || article.title,
      description,
      type: "article",
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;

  // AC-06: Return 404 for non-existent or non-published article
  const article = await prisma.article.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: "PUBLISHED",
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
    notFound();
  }

  // Clean and render content blocks (AC-29: safe formatting without script injection)
  const renderContent = (rawContent: string) => {
    // Split by double newlines into paragraphs or blocks
    const blocks = rawContent.split(/\n\s*\n/);

    return blocks.map((block, index) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Check Heading 2
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={index} className="text-xl sm:text-2xl font-bold text-white mt-8 mb-4">
            {trimmed.replace(/^##\s+/, "")}
          </h2>
        );
      }

      // Check Heading 3
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={index} className="text-lg sm:text-xl font-bold text-white mt-6 mb-3">
            {trimmed.replace(/^###\s+/, "")}
          </h3>
        );
      }

      // Check Blockquote
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote
            key={index}
            className="border-l-2 border-white pl-4 py-1 italic text-neutral-300 my-4 bg-neutral-950/60"
          >
            {trimmed.replace(/^>\s+/, "")}
          </blockquote>
        );
      }

      // Check Image markdown: ![alt](url)
      const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        return (
          <figure key={index} className="my-6 rounded-lg overflow-hidden border border-neutral-900 bg-neutral-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt || article.title} className="w-full object-cover max-h-[500px]" />
            {alt && (
              <figcaption className="text-center text-xs text-neutral-500 py-2 font-mono">
                {alt}
              </figcaption>
            )}
          </figure>
        );
      }

      // Check Bullet list
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split(/\n/).map((line) => line.replace(/^[-*]\s+/, ""));
        return (
          <ul key={index} className="list-disc list-inside space-y-1 my-4 text-neutral-300 pl-2">
            {items.map((item, itemIdx) => (
              <li key={itemIdx}>{item}</li>
            ))}
          </ul>
        );
      }

      // Standard Paragraph
      return (
        <p key={index} className="text-sm sm:text-base text-neutral-300 leading-relaxed my-4">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-white selection:text-black">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>กลับไปหน้ารวมข่าวสาร</span>
          </Link>
        </div>

        {/* Article Header (AC-05) */}
        <header className="space-y-4 pb-6 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            <Link
              href={`/news?category=${article.category.slug}`}
              className="px-2.5 py-1 rounded text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
            >
              {article.category.name}
            </Link>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            {article.title}
          </h1>

          {/* Editorial Standfirst / Deck */}
          {article.excerpt && (
            <p className="text-base sm:text-lg text-neutral-300 font-normal leading-relaxed pt-1">
              {article.excerpt}
            </p>
          )}

          {/* Author and Date Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 pt-2">
            <span className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
              <span>{article.author.name}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-neutral-500" />
              <time dateTime={article.publishedAt?.toISOString()}>
                {new Date(article.publishedAt || article.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </span>
          </div>
        </header>

        {/* Cover Image */}
        {article.coverImageUrl && (
          <div className="my-8 rounded-lg overflow-hidden border border-neutral-900 bg-neutral-950 aspect-video relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Body Content (AC-29) */}
        <article className="prose prose-invert max-w-none py-4 border-b border-neutral-900">
          {renderContent(article.content)}
        </article>

        {/* Tags Section (AC-30) */}
        {article.tags.length > 0 && (
          <div className="py-6 border-b border-neutral-900 space-y-2">
            <span className="text-xs font-mono text-neutral-400 block uppercase">
              แท็กที่เกี่ยวข้อง:
            </span>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/news?tag=${tag.slug}`}
                  className="px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Linked Event Cards (AC-25) */}
        {article.events.length > 0 && (
          <section className="mt-10 space-y-4">
            <div className="flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                คอนเสิร์ต / อีเวนต์ที่เกี่ยวข้อง (Featured Events)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {article.events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden flex flex-col justify-between hover:border-neutral-600 transition-colors"
                >
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold text-white text-base line-clamp-1">{ev.name}</h3>

                    <div className="space-y-1.5 text-xs text-neutral-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-neutral-500" />
                        <span>
                          {new Date(ev.eventDate).toLocaleDateString("th-TH")} • {ev.startTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="truncate">{ev.venue}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-sm font-bold text-white">
                      ฿{ev.ticketPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Link
                      href={`/events/${ev.id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-black font-semibold rounded text-xs hover:bg-neutral-200 transition-colors"
                    >
                      <span>ดูรายละเอียดและจองบัตร</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600 font-mono mt-16">
        <p>E-Tikket News & Articles • TICKETBOX MVP</p>
      </footer>
    </div>
  );
}
