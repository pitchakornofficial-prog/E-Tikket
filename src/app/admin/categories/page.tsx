"use client";

import { useEffect, useState, useTransition } from "react";
import { AdminNav } from "@/components/admin-nav";
import {
  SlidersIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  AlertTriangleIcon,
  CheckIcon,
  XIcon,
} from "@/components/icons";

interface ArticleCategoryItem {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ArticleCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);

  // Delete confirm state
  const [deletingCategory, setDeletingCategory] = useState<ArticleCategoryItem | null>(null);

  const [, startTransition] = useTransition();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/categories");
      if (!res.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลหมวดหมู่ได้");
      }
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategorySlug("");
    setAutoSlug(true);
    setIsModalOpen(true);
    setErrorMsg(null);
  };

  const handleOpenEditModal = (category: ArticleCategoryItem) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setAutoSlug(false);
    setIsModalOpen(true);
    setErrorMsg(null);
  };

  const handleNameChange = (val: string) => {
    setCategoryName(val);
    if (autoSlug && !editingCategory) {
      setCategorySlug(generateSlug(val));
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!categoryName.trim() || !categorySlug.trim()) {
      setErrorMsg("กรุณากรอกชื่อและ slug ให้ครบถ้วน");
      return;
    }

    try {
      if (editingCategory) {
        // PUT
        const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            slug: categorySlug.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "ไม่สามารถแก้ไขหมวดหมู่ได้");
        }
        setSuccessMsg(`แก้ไขหมวดหมู่ "${categoryName}" สำเร็จ`);
      } else {
        // POST
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            slug: categorySlug.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "ไม่สามารถสร้างหมวดหมู่ได้");
        }
        setSuccessMsg(`สร้างหมวดหมู่ "${categoryName}" สำเร็จ`);
      }

      setIsModalOpen(false);
      startTransition(() => {
        fetchCategories();
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // AC-16 check on UI level as well
    if (deletingCategory.articleCount > 0) {
      setErrorMsg(
        `ไม่สามารถลบหมวดหมู่ "${deletingCategory.name}" ได้เนื่องจากมีบทความที่เชื่อมโยงอยู่ (${deletingCategory.articleCount} บทความ)`,
      );
      setDeletingCategory(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "ไม่สามารถลบหมวดหมู่ได้");
      }

      setSuccessMsg(`ลบหมวดหมู่ "${deletingCategory.name}" สำเร็จ`);
      setDeletingCategory(null);
      startTransition(() => {
        fetchCategories();
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการลบหมวดหมู่");
      setDeletingCategory(null);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white transition-colors duration-200">
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                จัดการหมวดหมู่บทความ
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              กำหนดหมวดหมู่บทความสำหรับระบบ News & Blog เพื่อการจัดระเบียบเนื้อหาและ SEO
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            <span>สร้างหมวดหมู่ใหม่</span>
          </button>
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อหรือ slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-neutral-600 shadow-sm"
            />
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">กำลังโหลดหมวดหมู่...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {searchQuery ? "ไม่พบหมวดหมู่ที่ตรงกับการค้นหา" : "ยังไม่มีหมวดหมู่บทความ"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 dark:bg-neutral-900/90 text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ชื่อหมวดหมู่</th>
                    <th className="py-3 px-4 font-semibold font-mono">Slug</th>
                    <th className="py-3 px-4 font-semibold text-center">บทความที่เชื่อมโยง</th>
                    <th className="py-3 px-4 font-semibold text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60">
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-white">{cat.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                        /{cat.slug}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${
                            cat.articleCount > 0
                              ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                              : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
                          }`}
                        >
                          {cat.articleCount} บทความ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                            title="แก้ไข"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingCategory ? "แก้ไขหมวดหมู่" : "สร้างหมวดหมู่ใหม่"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  ชื่อหมวดหมู่ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="เช่น ข่าวสารคอนเสิร์ต, สัมภาษณ์ศิลปิน"
                  required
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Slug (URL Identifier) <span className="text-red-400">*</span>
                  </label>
                  {!editingCategory && (
                    <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSlug}
                        onChange={(e) => setAutoSlug(e.target.checked)}
                        className="rounded bg-neutral-950 border-neutral-800 text-white"
                      />
                      <span>Auto</span>
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  value={categorySlug}
                  onChange={(e) => {
                    setCategorySlug(e.target.value);
                    setAutoSlug(false);
                  }}
                  placeholder="concert-news"
                  required
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  ใช้เป็นตัวกรองใน URL เช่น /news?category={categorySlug || "slug"}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-semibold rounded text-sm hover:bg-neutral-200 transition-colors"
                >
                  {editingCategory ? "บันทึกการแก้ไข" : "สร้างหมวดหมู่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertTriangleIcon className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-white">ยืนยันการลบหมวดหมู่</h2>
            </div>

            {deletingCategory.articleCount > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-neutral-300">
                  ไม่สามารถลบหมวดหมู่ <span className="font-bold text-white">&quot;{deletingCategory.name}&quot;</span> ได้
                  เนื่องจากมีบทความที่เชื่อมโยงอยู่ <span className="font-bold text-white">{deletingCategory.articleCount} บทความ</span>
                </p>
                <p className="text-xs text-neutral-400 bg-neutral-950 p-3 rounded border border-neutral-800">
                  กรุณาแก้ไขบทความเหล่านั้นให้ไปอยู่หมวดหมู่อื่นก่อน จึงจะสามารถลบหมวดหมู่นี้ได้ (AC-16)
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setDeletingCategory(null)}
                    className="px-4 py-2 bg-neutral-800 text-white rounded text-sm hover:bg-neutral-700 transition-colors"
                  >
                    รับทราบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-300">
                  คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่{" "}
                  <span className="font-bold text-white">&quot;{deletingCategory.name}&quot;</span> (/{deletingCategory.slug})?
                </p>
                <p className="text-xs text-neutral-500">
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDeletingCategory(null)}
                    className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleDeleteCategory}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    ลบหมวดหมู่
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
