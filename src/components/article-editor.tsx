"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  FileTextIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  TargetIcon,
} from "@/components/icons";

export interface ArticleFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  categoryId: string;
  tagNames: string[];
  eventIds: string[];
  status?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface EventOption {
  id: string;
  name: string;
  eventDate: string;
}

interface ArticleEditorProps {
  role: "ADMIN" | "ORGANIZER";
  initialData?: Partial<ArticleFormData>;
  categories: CategoryOption[];
  events: EventOption[];
  existingTags: string[];
  uploadEndpoint: string;
  onSaveDraft: (data: ArticleFormData) => Promise<void>;
  onPublish?: (data: ArticleFormData) => Promise<void>;
  onSubmitReview?: (data: ArticleFormData) => Promise<void>;
  backHref: string;
  isSaving: boolean;
  errorMsg: string | null;
  successMsg: string | null;
}

export function ArticleEditor({
  role,
  initialData,
  categories,
  events,
  existingTags,
  uploadEndpoint,
  onSaveDraft,
  onPublish,
  onSubmitReview,
  backHref,
  isSaving,
  errorMsg,
  successMsg,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [autoSlug, setAutoSlug] = useState(!initialData?.slug);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || "");
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || "");
  const [ogImageUrl, setOgImageUrl] = useState(initialData?.ogImageUrl || "");
  const [tagNames, setTagNames] = useState<string[]>(initialData?.tagNames || []);
  const [tagInput, setTagInput] = useState("");
  const [eventIds, setEventIds] = useState<string[]>(initialData?.eventIds || []);

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [seoCollapsed, setSeoCollapsed] = useState(true);
  const [eventSearch, setEventSearch] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const generateSlug = (text: string) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) {
      setSlug(generateSlug(val));
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = tagToAdd || tagInput;
    const trimmed = raw.trim();
    if (trimmed && !tagNames.includes(trimmed)) {
      setTagNames([...tagNames, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagNames(tagNames.filter((t) => t !== tagToRemove));
  };

  const handleToggleEvent = (id: string) => {
    if (eventIds.includes(id)) {
      setEventIds(eventIds.filter((e) => e !== id));
    } else {
      setEventIds([...eventIds, id]);
    }
  };

  // Image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setLocalError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "อัปโหลดรูปภาพไม่สำเร็จ");
      }

      setCoverImageUrl(data.url);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setLocalError(error.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInline(true);
    setLocalError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "อัปโหลดรูปภาพไม่สำเร็จ");
      }

      const imgMarkdown = `\n![${file.name}](${data.url})\n`;
      insertTextAtCursor(imgMarkdown);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setLocalError(error.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingInline(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = "";
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) {
      setContent((prev) => prev + textToInsert);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    setContent(before + textToInsert + after);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }
    }, 0);
  };

  const applyFormatting = (prefix: string, suffix = "") => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const formatted = `${prefix}${selected || "ข้อความ"}${suffix}`;
    insertTextAtCursor(formatted);
  };

  const getFormData = (): ArticleFormData => ({
    title: title.trim(),
    slug: slug.trim(),
    content: content.trim(),
    excerpt: excerpt.trim(),
    coverImageUrl: coverImageUrl.trim(),
    seoTitle: seoTitle.trim(),
    seoDescription: seoDescription.trim(),
    ogImageUrl: ogImageUrl.trim(),
    categoryId,
    tagNames,
    eventIds,
  });

  const validate = () => {
    if (!title.trim()) {
      setLocalError("กรุณากรอกหัวข้อบทความ");
      return false;
    }
    if (!slug.trim()) {
      setLocalError("กรุณากรอก slug ของบทความ");
      return false;
    }
    if (!categoryId) {
      setLocalError("กรุณาเลือกหมวดหมู่บทความ");
      return false;
    }
    if (!content.trim()) {
      setLocalError("กรุณากรอกเนื้อหาบทความ");
      return false;
    }
    return true;
  };

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!validate()) return;
    await onSaveDraft(getFormData());
  };

  const handlePublish = async () => {
    setLocalError(null);
    if (!validate() || !onPublish) return;
    await onPublish(getFormData());
  };

  const handleSubmitForReview = async () => {
    setLocalError(null);
    if (!validate() || !onSubmitReview) return;
    await onSubmitReview(getFormData());
  };

  const filteredEvents = events.filter((ev) =>
    ev.name.toLowerCase().includes(eventSearch.toLowerCase()),
  );

  const matchingTagSuggestions = existingTags.filter(
    (t) =>
      tagInput.trim() &&
      t.toLowerCase().includes(tagInput.toLowerCase()) &&
      !tagNames.includes(t),
  );

  return (
    <div className="space-y-6">
      {/* Top Bar with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>ย้อนกลับไปหน้ารายการ</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmitDraft}
            disabled={isSaving}
            className="px-4 py-2 bg-neutral-800 text-white font-medium rounded text-xs sm:text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกร่าง (Save Draft)"}
          </button>

          {role === "ADMIN" && onPublish && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSaving}
              className="px-4 py-2 bg-white text-black font-semibold rounded text-xs sm:text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? "กำลังบันทึก..." : "เผยแพร่ทันที (Publish)"}
            </button>
          )}

          {role === "ORGANIZER" && onSubmitReview && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={isSaving}
              className="px-4 py-2 bg-white text-black font-semibold rounded text-xs sm:text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? "กำลังส่ง..." : "ส่งให้อนุมัติ (Submit for Review)"}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {(errorMsg || localError) && (
        <div className="p-4 rounded bg-red-950/50 border border-red-800 text-red-200 flex items-start gap-3 text-sm">
          <AlertTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg || localError}</div>
          <button
            onClick={() => setLocalError(null)}
            className="text-red-400 hover:text-white"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-200 flex items-start gap-3 text-sm">
          <CheckIcon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Editor (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              หัวข้อบทความ <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="เช่น เจาะลึกกระแสดนตรีอินดี้ไทยปี 2026..."
              required
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded text-base font-semibold text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Slug (URL Identifier) <span className="text-red-400">*</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSlug}
                  onChange={(e) => setAutoSlug(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-800 text-white"
                />
                <span>Auto-generate จากชื่อ</span>
              </label>
            </div>
            <div className="flex items-center rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
              <span className="text-neutral-500 font-mono text-xs mr-1">/news/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                placeholder="thai-indie-music-2026"
                required
                className="w-full bg-transparent font-mono text-xs text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              ต้องไม่ซ้ำกับบทความอื่นในระบบ (AC-22)
            </p>
          </div>

          {/* Rich Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                เนื้อหาบทความ <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`px-3 py-1 rounded transition-colors ${
                    activeTab === "edit"
                      ? "bg-neutral-800 text-white font-medium"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  เขียน (Editor)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded transition-colors ${
                    activeTab === "preview"
                      ? "bg-neutral-800 text-white font-medium"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  ดูตัวอย่าง (Preview)
                </button>
              </div>
            </div>

            {activeTab === "edit" ? (
              <div className="border border-neutral-800 rounded bg-neutral-900 overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-2 bg-neutral-950/60 border-b border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => applyFormatting("**", "**")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 font-bold text-neutral-300 hover:text-white"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("*", "*")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 italic text-neutral-300 hover:text-white"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("## ")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 font-semibold text-neutral-300 hover:text-white"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("### ")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 font-semibold text-neutral-300 hover:text-white"
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <div className="w-[1px] h-4 bg-neutral-800 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormatting("- ")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
                    title="Bullet list"
                  >
                    • รายการ
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("> ")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
                    title="Quote"
                  >
                    &ldquo; อ้างอิง
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("[ข้อความลิงก์](", ")")}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
                    title="Link"
                  >
                    ลิงก์
                  </button>
                  <div className="w-[1px] h-4 bg-neutral-800 mx-1" />
                  <input
                    type="file"
                    ref={inlineFileInputRef}
                    onChange={handleInlineImageUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => inlineFileInputRef.current?.click()}
                    disabled={uploadingInline}
                    className="p-1.5 px-2 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white disabled:opacity-50"
                    title="แทรกรูปภาพ"
                  >
                    {uploadingInline ? "กำลังอัปโหลด..." : "🖼️ แทรกรูปภาพ"}
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={16}
                  placeholder="เขียนเนื้อหาบทความที่นี่... รองรับการจัดรูปแบบ Markdown และแทรกรูปภาพ"
                  className="w-full p-4 bg-transparent text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none resize-y font-mono leading-relaxed"
                />
              </div>
            ) : (
              <div className="border border-neutral-800 rounded bg-neutral-900 p-6 min-h-[400px] prose prose-invert max-w-none text-sm">
                {content ? (
                  <div className="space-y-4 whitespace-pre-wrap leading-relaxed text-neutral-200">
                    {content}
                  </div>
                ) : (
                  <p className="text-neutral-500 italic">ยังไม่มีเนื้อหา</p>
                )}
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              คำโปรยย่อ (Excerpt)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="คำอธิบายสรุปสั้นๆ สำหรับแสดงบนการ์ดในหน้ารวมบทความ (หากไม่ระบุ ระบบจะใช้ย่อหน้าแรกโดยอัตโนมัติ)"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        {/* Right Column: Metadata & Settings (1 col) */}
        <div className="space-y-6">
          {/* Category Select */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
                หมวดหมู่บทความ <span className="text-red-400">*</span>
              </label>
              {role === "ADMIN" && (
                <Link
                  href="/admin/categories"
                  className="text-[11px] text-neutral-400 hover:text-white underline"
                >
                  จัดการหมวดหมู่
                </Link>
              )}
            </div>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-neutral-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cover Image Upload */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
              รูปภาพหน้าปก (Cover Image)
            </label>

            {coverImageUrl ? (
              <div className="space-y-2">
                <div className="relative aspect-video rounded overflow-hidden border border-neutral-800 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-white"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-400 font-mono"
                />
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCoverUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full py-8 border border-dashed border-neutral-700 hover:border-neutral-500 rounded flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <FileTextIcon className="w-6 h-6" />
                  <span className="text-xs font-medium">
                    {uploadingCover ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกไฟล์รูปภาพ (JPEG, PNG, WebP)"}
                  </span>
                  <span className="text-[10px] text-neutral-500">ขนาดไม่เกิน 5 MB (AC-27, AC-28)</span>
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
              แท็ก (Tags)
            </label>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {tagNames.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-800 text-xs text-neutral-200 border border-neutral-700"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="พิมพ์แท็กแล้วกดเพิ่ม..."
                className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-medium"
              >
                เพิ่ม
              </button>
            </div>

            {/* Suggestions */}
            {matchingTagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] text-neutral-500 w-full">แท็กที่แนะนำ:</span>
                {matchingTagSuggestions.slice(0, 5).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddTag(sug)}
                    className="text-[11px] px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800"
                  >
                    +{sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linked Events */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
              เชื่อมโยงคอนเสิร์ต / อีเวนต์ (AC-25)
            </label>

            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="ค้นหาคอนเสิร์ต..."
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-neutral-800/40">
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-neutral-500 py-2 text-center">ไม่พบคอนเสิร์ต</p>
              ) : (
                filteredEvents.map((ev) => {
                  const isChecked = eventIds.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className="flex items-center gap-2 py-1.5 px-1 hover:bg-neutral-800/40 rounded cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEvent(ev.id)}
                        className="rounded bg-neutral-950 border-neutral-700 text-white"
                      />
                      <span className="flex-1 truncate text-neutral-200">{ev.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{ev.eventDate}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* SEO Metadata Section (Collapsible) */}
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
            <button
              type="button"
              onClick={() => setSeoCollapsed(!seoCollapsed)}
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-300"
            >
              <span className="flex items-center gap-1.5">
                <TargetIcon className="w-4 h-4 text-neutral-400" />
                <span>SEO & Social Metadata (AC-23, AC-24)</span>
              </span>
              <span>{seoCollapsed ? "+" : "-"}</span>
            </button>

            {!seoCollapsed && (
              <div className="space-y-4 pt-4 mt-3 border-t border-neutral-800 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Custom SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || "ค่าเริ่มต้นใช้หัวข้อบทความ"}
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Fallback: {title || "หัวข้อบทความ"}</p>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Meta Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={2}
                    placeholder={excerpt || "ค่าเริ่มต้นใช้คำโปรยหรือย่อหน้าแรก"}
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Fallback: {excerpt || "ย่อหน้าแรกของเนื้อหา"}</p>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Open Graph Image URL</label>
                  <input
                    type="text"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder={coverImageUrl || "ค่าเริ่มต้นใช้รูปหน้าปก"}
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-white placeholder-neutral-600 focus:outline-none font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Fallback: {coverImageUrl || "รูปหน้าปกบทความ"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
