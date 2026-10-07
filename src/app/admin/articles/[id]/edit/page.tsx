"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { ArticleEditor, ArticleFormData } from "@/components/article-editor";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminEditArticlePage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [article, setArticle] = useState<ArticleFormData | null>(null);
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
        const [artRes, catRes, evRes, allArtRes] = await Promise.all([
          fetch(`/api/admin/articles/${id}`),
          fetch("/api/admin/categories"),
          fetch("/api/admin/events"),
          fetch("/api/admin/articles"),
        ]);

        if (!artRes.ok) {
          throw new Error("ไม่พบบทความที่ต้องการแก้ไข");
        }

        const artData = await artRes.json();
        const a = artData.article;
        setArticle({
          title: a.title,
          slug: a.slug,
          content: a.content,
          excerpt: a.excerpt || "",
          coverImageUrl: a.coverImageUrl || "",
          seoTitle: a.seoTitle || "",
          seoDescription: a.seoDescription || "",
          ogImageUrl: a.ogImageUrl || "",
          categoryId: a.categoryId,
          tagNames: a.tags.map((t: { name: string }) => t.name),
          eventIds: a.events.map((e: { id: string }) => e.id),
          status: a.status,
        });

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (evRes.ok) {
          const evData = await evRes.json();
          setEvents(evData.events || []);
        }

        if (allArtRes.ok) {
          const allData = await allArtRes.json();
          const allTags = new Set<string>();
          for (const item of allData.articles || []) {
            for (const tag of item.tags || []) {
              if (tag.name) allTags.add(tag.name);
            }
          }
          setExistingTags(Array.from(allTags));
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        setErrorMsg(error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลบทความ");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleSave = async (data: ArticleFormData, publish = false) => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: Record<string, unknown> = { ...data };
      if (publish) {
        payload.status = "PUBLISHED";
      }

      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "บันทึกการแก้ไขไม่สำเร็จ");
      }

      setSuccessMsg("บันทึกการแก้ไขบทความสำเร็จ กำลังนำกลับไปหน้ารายการ...");
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <AdminNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
            แก้ไขบทความ
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            แก้ไขเนื้อหา ข้อมูลหมวดหมู่ และ SEO metadata
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-400">กำลังโหลดข้อมูล...</div>
        ) : !article ? (
          <div className="p-12 text-center text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 rounded">
            {errorMsg || "ไม่พบบทความ"}
          </div>
        ) : (
          <ArticleEditor
            role="ADMIN"
            initialData={article}
            categories={categories}
            events={events}
            existingTags={existingTags}
            uploadEndpoint="/api/admin/articles/upload"
            onSaveDraft={(data) => handleSave(data, false)}
            onPublish={(data) => handleSave(data, true)}
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
