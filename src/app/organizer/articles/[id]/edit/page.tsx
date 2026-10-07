"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { OrganizerNav } from "@/components/organizer-nav";
import { ArticleEditor, ArticleFormData } from "@/components/article-editor";
import { AlertTriangleIcon } from "@/components/icons";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizerEditArticlePage({ params }: EditPageProps) {
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
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [artRes, catRes, evRes, allArtRes] = await Promise.all([
          fetch(`/api/organizer/articles/${id}`),
          fetch("/api/admin/categories"),
          fetch("/api/events"),
          fetch("/api/organizer/articles"),
        ]);

        if (!artRes.ok) {
          const err = await artRes.json();
          throw new Error(err.error?.message || "ไม่พบบทความที่ต้องการแก้ไข หรือคุณไม่มีสิทธิ์เข้าถึง");
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

        setIsPublished(a.status === "PUBLISHED");

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

  const handleSave = async (data: ArticleFormData, submitReview = false) => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: Record<string, unknown> = {
        ...data,
        submitForReview: submitReview,
      };

      const res = await fetch(`/api/organizer/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "บันทึกการแก้ไขไม่สำเร็จ");
      }

      const msg = submitReview
        ? "ส่งบทความเพื่อตรวจสอบสำเร็จ กำลังนำกลับไปหน้ารายการ..."
        : isPublished
        ? "บันทึกการแก้ไขสำเร็จ (สถานะถูกเปลี่ยนเป็น PENDING REVIEW อัตโนมัติ)"
        : "บันทึกการแก้ไขบทความสำเร็จ";

      setSuccessMsg(msg);
      setTimeout(() => {
        router.push("/organizer/articles");
      }, 1000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <OrganizerNav />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
            แก้ไขบทความ
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            แก้ไขเนื้อหาและข้อมูลบทความของคุณ
          </p>
        </div>

        {/* AC-19 Warning Banner for Published articles */}
        {isPublished && (
          <div className="mb-6 p-4 rounded bg-yellow-950/40 border border-yellow-700 text-yellow-200 flex items-start gap-3 text-xs sm:text-sm">
            <AlertTriangleIcon className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">คำเตือน: บทความนี้ได้รับการเผยแพร่แล้ว</p>
              <p className="text-yellow-300/90 leading-relaxed">
                การแก้ไขและบันทึกจะทำให้สถานะของบทความเปลี่ยนเป็น <strong>รอตรวจสอบ (Pending Review)</strong> โดยอัตโนมัติ
                และจะไม่แสดงบนหน้าเว็บสาธารณะจนกว่าผู้ดูแลระบบจะอนุมัติอีกครั้ง (AC-19)
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm text-neutral-400">กำลังโหลดข้อมูล...</div>
        ) : !article ? (
          <div className="p-12 text-center text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 rounded">
            {errorMsg || "ไม่พบบทความ"}
          </div>
        ) : (
          <ArticleEditor
            role="ORGANIZER"
            initialData={article}
            categories={categories}
            events={events}
            existingTags={existingTags}
            uploadEndpoint="/api/organizer/articles/upload"
            onSaveDraft={(data) => handleSave(data, false)}
            onSubmitReview={(data) => handleSave(data, true)}
            backHref="/organizer/articles"
            isSaving={isSaving}
            errorMsg={errorMsg}
            successMsg={successMsg}
          />
        )}
      </main>
    </div>
  );
}
