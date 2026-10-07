"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { OrganizerNav } from "@/components/organizer-nav";
import {
  FileTextIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
} from "@/components/icons";

interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
}

interface ArticleTag {
  id: string;
  name: string;
  slug: string;
}

interface OrganizerArticleItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  category: ArticleCategory;
  tags: ArticleTag[];
}

export default function OrganizerArticlesPage() {
  const [articles, setArticles] = useState<OrganizerArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete modal state
  const [deletingArticle, setDeletingArticle] = useState<OrganizerArticleItem | null>(null);

  const [, startTransition] = useTransition();

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/organizer/articles");
      if (!res.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลบทความได้");
      }
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSubmitForReview = async (articleId: string, articleTitle: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/organizer/articles/${articleId}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "ไม่สามารถส่งบทความเพื่อตรวจสอบได้");
      }

      setSuccessMsg(`ส่งบทความ "${articleTitle}" ให้ผู้ดูแลระบบตรวจสอบเรียบร้อยแล้ว`);
      startTransition(() => {
        fetchArticles();
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการส่งบทความ");
    }
  };

  const handleDeleteArticle = async () => {
    if (!deletingArticle) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // AC-21 check
    if (deletingArticle.status !== "DRAFT") {
      setErrorMsg("ผู้จัดงานสามารถลบได้เฉพาะบทความที่เป็นแบบร่าง (Draft) เท่านั้น");
      setDeletingArticle(null);
      return;
    }

    try {
      const res = await fetch(`/api/organizer/articles/${deletingArticle.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "ไม่สามารถลบบทความได้");
      }

      setSuccessMsg(`ลบบทความ "${deletingArticle.title}" สำเร็จ`);
      setDeletingArticle(null);
      startTransition(() => {
        fetchArticles();
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการลบบทความ");
      setDeletingArticle(null);
    }
  };

  const getStatusBadge = (status: OrganizerArticleItem["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-black font-mono">
            PUBLISHED
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-400 text-black font-mono">
            PENDING REVIEW
          </span>
        );
      case "DRAFT":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 text-neutral-300 font-mono">
            DRAFT
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-900 text-neutral-500 font-mono">
            ARCHIVED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <OrganizerNav />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileTextIcon className="w-5 h-5 text-neutral-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                บทความของฉัน (My Articles)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400">
              สร้างบทความเพื่อโปรโมตอีเวนต์และดนตรีของคุณ เมื่อส่งตรวจสอบแล้ว แอดมินจะพิจารณาอนุมัติเพื่อเผยแพร่สู่สาธารณะ
            </p>
          </div>

          <Link
            href="/organizer/articles/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded text-sm hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>เขียนบทความใหม่</span>
          </Link>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-red-950/50 border border-red-800 text-red-200 flex items-start gap-3 text-sm">
            <AlertTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-200 flex items-start gap-3 text-sm">
            <CheckIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Articles Table */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-neutral-400">กำลังโหลดบทความ...</div>
          ) : articles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm text-neutral-400">คุณยังไม่มีบทความในระบบ</p>
              <Link
                href="/organizer/articles/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded text-xs hover:bg-neutral-200"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>เริ่มเขียนบทความแรก</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-900/90 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">หัวข้อบทความ</th>
                    <th className="py-3 px-4 font-semibold">หมวดหมู่</th>
                    <th className="py-3 px-4 font-semibold text-center">สถานะ</th>
                    <th className="py-3 px-4 font-semibold">วันที่สร้าง</th>
                    <th className="py-3 px-4 font-semibold text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {articles.map((art) => (
                    <tr key={art.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white max-w-sm truncate">{art.title}</div>
                        <div className="text-[11px] font-mono text-neutral-500 truncate">
                          /news/{art.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-300">
                        {art.category.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(art.status)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-neutral-400">
                        {new Date(art.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Submit for review button (AC-18) */}
                          {art.status === "DRAFT" && (
                            <button
                              onClick={() => handleSubmitForReview(art.id, art.title)}
                              className="px-2.5 py-1 bg-white text-black font-semibold rounded text-xs hover:bg-neutral-200 transition-colors"
                              title="ส่งให้แอดมินตรวจสอบ"
                            >
                              ส่งตรวจสอบ
                            </button>
                          )}

                          {/* Edit Link */}
                          <Link
                            href={`/organizer/articles/${art.id}/edit`}
                            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                            title="แก้ไข"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Link>

                          {/* Delete Action (AC-21: Only for DRAFT) */}
                          {art.status === "DRAFT" && (
                            <button
                              onClick={() => setDeletingArticle(art)}
                              className="p-1.5 rounded hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition-colors"
                              title="ลบแบบร่าง"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deletingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangleIcon className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-white">ยืนยันการลบแบบร่าง</h2>
            </div>

            <p className="text-sm text-neutral-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบแบบร่างบทความ{" "}
              <span className="font-bold text-white">&quot;{deletingArticle.title}&quot;</span>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingArticle(null)}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteArticle}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded text-sm hover:bg-red-700 transition-colors"
              >
                ลบแบบร่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
