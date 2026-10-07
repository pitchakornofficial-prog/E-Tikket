"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import {
  FileTextIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  SlidersIcon,
} from "@/components/icons";

interface ArticleAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

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

interface AdminArticleItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  author: ArticleAuthor;
  category: ArticleCategory;
  tags: ArticleTag[];
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<AdminArticleItem[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeStatusTab, setActiveStatusTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete modal state
  const [deletingArticle, setDeletingArticle] = useState<AdminArticleItem | null>(null);

  const [, startTransition] = useTransition();

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/articles");
      if (!res.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลบทความได้");
      }
      const data = await res.json();
      setArticles(data.articles || []);
      setPendingReviewCount(data.pendingReviewCount || 0);
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

  const handleStateTransition = async (
    articleId: string,
    action: "publish" | "unpublish" | "archive" | "approve" | "reject",
    articleTitle: string,
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/articles/${articleId}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `ไม่สามารถดำเนินการ ${action} ได้`);
      }

      const actionLabels: Record<string, string> = {
        publish: "เผยแพร่",
        unpublish: "ยกเลิกการเผยแพร่",
        archive: "เก็บถาวร",
        approve: "อนุมัติ",
        reject: "ส่งกลับเป็นแบบร่าง",
      };

      setSuccessMsg(`${actionLabels[action] || action} บทความ "${articleTitle}" สำเร็จ`);
      startTransition(() => {
        fetchArticles();
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการปรับสถานะบทความ");
    }
  };

  const handleDeleteArticle = async () => {
    if (!deletingArticle) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/articles/${deletingArticle.id}`, {
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

  const filteredArticles = articles.filter((art) => {
    if (activeStatusTab !== "ALL" && art.status !== activeStatusTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        art.slug.toLowerCase().includes(q) ||
        art.author.name.toLowerCase().includes(q) ||
        art.category.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: AdminArticleItem["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-black dark:bg-white text-white dark:text-black font-mono shadow-sm">
            PUBLISHED
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-black font-mono animate-pulse">
            PENDING REVIEW
          </span>
        );
      case "DRAFT":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono">
            DRAFT
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-500 font-mono">
            ARCHIVED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white transition-colors duration-200">
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileTextIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                จัดการบทความ (News & Blog)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              สร้าง เผยแพร่ และตรวจสอบบทความสำหรับ SEO ของแพลตฟอร์ม
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/categories"
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded text-xs sm:text-sm transition-colors shadow-sm"
            >
              <SlidersIcon className="w-4 h-4" />
              <span>จัดการหมวดหมู่</span>
            </Link>

            <Link
              href="/admin/articles/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded text-xs sm:text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>เขียนบทความใหม่</span>
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 flex items-start gap-3 text-sm">
            <AlertTriangleIcon className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 dark:text-red-400 hover:text-black dark:hover:text-white">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-3 text-sm">
            <CheckIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 dark:text-emerald-400 hover:text-black dark:hover:text-white">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search (AC-10) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded text-xs">
            {[
              { id: "ALL", label: "ทั้งหมด" },
              { id: "PENDING_REVIEW", label: "รอตรวจสอบ", count: pendingReviewCount },
              { id: "PUBLISHED", label: "เผยแพร่แล้ว" },
              { id: "DRAFT", label: "แบบร่าง" },
              { id: "ARCHIVED", label: "เก็บถาวร" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                  activeStatusTab === tab.id
                    ? "bg-white dark:bg-neutral-800 text-black dark:text-white font-semibold shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-300 dark:hover:bg-neutral-850"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-black">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <SearchIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, ผู้เขียน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-neutral-400">กำลังโหลดรายการบทความ...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              {searchQuery ? "ไม่พบบทความที่ตรงกับการค้นหา" : "ไม่มีบทความในหมวดหมู่นี้"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 dark:bg-neutral-900/90 text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">หัวข้อบทความ</th>
                    <th className="py-3 px-4 font-semibold">หมวดหมู่</th>
                    <th className="py-3 px-4 font-semibold">ผู้เขียน</th>
                    <th className="py-3 px-4 font-semibold text-center">สถานะ</th>
                    <th className="py-3 px-4 font-semibold">วันที่</th>
                    <th className="py-3 px-4 font-semibold text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
                  {filteredArticles.map((art) => (
                    <tr
                      key={art.id}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors ${
                        art.status === "PENDING_REVIEW" ? "bg-amber-50 dark:bg-yellow-950/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-900 dark:text-white max-w-sm truncate">{art.title}</div>
                        <div className="text-[11px] font-mono text-neutral-500 truncate">
                          /news/{art.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-600 dark:text-neutral-300">
                        {art.category.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-neutral-800 dark:text-neutral-200">{art.author.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {art.author.role}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(art.status)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-neutral-500 dark:text-neutral-400">
                        {new Date(art.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pending Review Approvals (AC-11, AC-12) */}
                          {art.status === "PENDING_REVIEW" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStateTransition(art.id, "approve", art.title)
                                }
                                className="px-2 py-1 bg-white text-black font-semibold rounded text-xs hover:bg-neutral-200 transition-colors"
                                title="อนุมัติและเผยแพร่"
                              >
                                อนุมัติ
                              </button>
                              <button
                                onClick={() =>
                                  handleStateTransition(art.id, "reject", art.title)
                                }
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors"
                                title="ปฏิเสธกลับเป็นแบบร่าง"
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          )}

                          {/* Quick Publish / Unpublish */}
                          {art.status === "DRAFT" && (
                            <button
                              onClick={() => handleStateTransition(art.id, "publish", art.title)}
                              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs"
                              title="เผยแพร่ทันที"
                            >
                              เผยแพร่
                            </button>
                          )}

                          {art.status === "PUBLISHED" && (
                            <button
                              onClick={() => handleStateTransition(art.id, "unpublish", art.title)}
                              className="px-2 py-1 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded text-xs"
                              title="ยกเลิกเผยแพร่ (เป็นแบบร่าง)"
                            >
                              Unpublish
                            </button>
                          )}

                          {/* Edit Link */}
                          <Link
                            href={`/admin/articles/${art.id}/edit`}
                            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                            title="แก้ไข"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Link>

                          {/* Delete Action (AC-14) */}
                          <button
                            onClick={() => setDeletingArticle(art)}
                            className="p-1.5 rounded hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition-colors"
                            title="ลบ"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
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
              <h2 className="text-lg font-bold text-white">ยืนยันการลบบทความ</h2>
            </div>

            <p className="text-sm text-neutral-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบบทความ{" "}
              <span className="font-bold text-white">&quot;{deletingArticle.title}&quot;</span>?
            </p>
            <p className="text-xs text-neutral-500">
              การกระทำนี้จะลบบทความออกจากระบบอย่างถาวร (AC-14)
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
                ลบบทความ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
