"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { ArticleEditor, ArticleFormData } from "@/components/article-editor";

export default function AdminNewArticlePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string; eventDate: string }[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catRes, evRes, artRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/events"),
          fetch("/api/admin/articles"),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
        }

        if (artRes.ok) {
          const artData = await artRes.json();
          const allTags = new Set<string>();
          for (const art of artData.articles || []) {
            for (const tag of art.tags || []) {
              if (tag.name) allTags.add(tag.name);
            }
          }
          setExistingTags(Array.from(allTags));
        }
      } catch (err: unknown) {
        console.error("Failed to load initial data for new article:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveDraft = async (data: ArticleFormData) => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          publishImmediately: false,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "บันทึกแบบร่างไม่สำเร็จ");
      }

      setSuccessMsg("บันทึกแบบร่างสำเร็จ กำลังนำกลับไปหน้ารายการ...");
      setTimeout(() => {
        router.push("/admin/articles");
      }, 1000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (data: ArticleFormData) => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          publishImmediately: true,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "เผยแพร่บทความไม่สำเร็จ");
      }

      setSuccessMsg("เผยแพร่บทความสำเร็จ กำลังนำกลับไปหน้ารายการ...");
      setTimeout(() => {
        router.push("/admin/articles");
      }, 1000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการเผยแพร่");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white transition-colors duration-200">
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
            เขียนบทความใหม่
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            สร้างบทความใหม่สำหรับเผยแพร่ในหน้า News & Blog
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-500 dark:text-neutral-400">กำลังโหลดข้อมูล...</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded">
            ยังไม่มีหมวดหมู่บทความ กรุณาไปสร้างหมวดหมู่ก่อน{" "}
            <a href="/admin/categories" className="text-black dark:text-white underline font-semibold">
              สร้างหมวดหมู่
            </a>
          </div>
        ) : (
          <ArticleEditor
            role="ADMIN"
            categories={categories}
            events={events}
            existingTags={existingTags}
            uploadEndpoint="/api/admin/articles/upload"
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            backHref="/admin/articles"
            isSaving={isSaving}
            errorMsg={errorMsg}
            successMsg={successMsg}
          />
        )}
      </main>
    </div>
  );
}
