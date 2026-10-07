"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  UserIcon,
  TargetIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  SearchIcon,
  EditIcon,
} from "@/components/icons";

interface OrganizerUser {
  id: string;
  name: string;
  email: string;
}

interface AdminEventItem {
  id: string;
  name: string;
  category: string;
  description: string;
  venue: string;
  eventDate: string;
  startTime: string;
  ticketPrice: string;
  totalTickets: number;
  availableTickets: number;
  soldTickets: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  imageUrl: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
}

const PRESET_CATEGORIES = ["Indie Pop", "Rock", "Acoustic", "EDM", "Jazz"];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Indie Pop",
    customCategory: "",
    description: "",
    venue: "",
    eventDate: "",
    startTime: "19:00",
    ticketPrice: "450",
    totalTickets: "100",
    imageUrl: "/poster-summer.svg",
    organizerId: "",
    status: "PUBLISHED",
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [eventsRes, orgsRes] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/organizers"),
      ]);

      if (!eventsRes.ok || !orgsRes.ok) {
        setErrorMsg("เกิดข้อผิดพลาดในการโหลดข้อมูล (เฉพาะ ADMIN เท่านั้น)");
        setLoading(false);
        return;
      }

      const eventsData = await eventsRes.json();
      const orgsData = await orgsRes.json();

      setEvents(eventsData.events || []);
      const orgList: OrganizerUser[] = orgsData.organizers || [];
      setOrganizers(orgList);
      if (orgList.length > 0 && !formData.organizerId) {
        setFormData((prev) => ({ ...prev, organizerId: orgList[0].id }));
      }
      setLoading(false);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateModal = () => {
    setEditingEventId(null);
    setFormError(null);
    setFormData({
      name: "",
      category: "Indie Pop",
      customCategory: "",
      description: "",
      venue: "",
      eventDate: "",
      startTime: "19:00",
      ticketPrice: "450",
      totalTickets: "100",
      imageUrl: "/poster-summer.svg",
      organizerId: organizers[0]?.id || "",
      status: "PUBLISHED",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event: AdminEventItem) => {
    setEditingEventId(event.id);
    setFormError(null);

    const isPreset = PRESET_CATEGORIES.includes(event.category);
    setFormData({
      name: event.name,
      category: isPreset ? event.category : "อื่นๆ",
      customCategory: isPreset ? "" : event.category,
      description: event.description || "",
      venue: event.venue,
      eventDate: event.eventDate,
      startTime: event.startTime,
      ticketPrice: String(parseFloat(event.ticketPrice)),
      totalTickets: String(event.totalTickets),
      imageUrl: event.imageUrl || "/poster-summer.svg",
      organizerId: event.organizer.id,
      status: event.status,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const finalCategory =
      formData.category === "อื่นๆ"
        ? formData.customCategory.trim() || "Concert"
        : formData.category;

    const payload = {
      ...formData,
      category: finalCategory,
      ticketPrice: parseFloat(formData.ticketPrice),
      totalTickets: parseInt(formData.totalTickets, 10),
    };

    try {
      const endpoint = editingEventId
        ? `/api/admin/events/${editingEventId}`
        : "/api/admin/events";
      const method = editingEventId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(
          data.error?.message ||
            (editingEventId
              ? "ไม่สามารถบันทึกการแก้ไขคอนเสิร์ตได้"
              : "ไม่สามารถสร้างคอนเสิร์ตได้"),
        );
        setSubmitting(false);
        return;
      }

      setSuccessMsg(
        editingEventId
          ? `อัปเดตข้อมูลคอนเสิร์ต "${formData.name}" เรียบร้อยแล้ว`
          : `สร้างคอนเสิร์ต "${formData.name}" และมอบหมายให้ผู้จัดงานเรียบร้อยแล้ว`,
      );
      setIsModalOpen(false);
      setEditingEventId(null);
      fetchData();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  // Extract categories
  const categories = ["ทั้งหมด", ...Array.from(new Set(events.map((e) => e.category)))];

  const filteredEvents = events.filter((e) => {
    const matchesCategory =
      selectedCategory === "ทั้งหมด" || e.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      e.name.toLowerCase().includes(query) ||
      e.venue.toLowerCase().includes(query) ||
      e.organizer.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      <AdminNav />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 dark:border-neutral-900 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">จัดการคอนเสิร์ต & มอบหมายผู้จัดงาน</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              สร้าง กำหนดรายละเอียดเบื้องต้น และมอบหมายคอนเสิร์ตให้ผู้จัดงาน (Organizer) ดูแลสแกนบัตร
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span>
            <span>เพิ่มคอนเสิร์ตใหม่</span>
          </button>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-600 rounded text-emerald-800 dark:text-emerald-200 text-xs flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5" />
              <span>{successMsg}</span>
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-black dark:hover:text-white">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-400 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-xs flex items-center gap-1.5">
            <AlertTriangleIcon className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-neutral-950 p-4 border border-neutral-200 dark:border-neutral-900 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium mr-1">หมวดหมู่:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  selectedCategory === cat
                    ? "bg-black dark:bg-white text-white dark:text-black font-bold shadow-sm"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-300 dark:border-neutral-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
              <SearchIcon className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่องาน, สถานที่, ผู้จัด..."
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
        </div>

        {/* Event List */}
        {loading ? (
          <div className="text-center py-16 space-y-2">
            <div className="w-6 h-6 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">กำลังโหลดรายการคอนเสิร์ต...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-950/40 rounded-lg text-center space-y-2">
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">ไม่พบคอนเสิร์ตที่ตรงกับเงื่อนไข</p>
            <button
              onClick={openCreateModal}
              className="text-xs text-neutral-500 dark:text-neutral-400 underline hover:text-black dark:hover:text-white"
            >
              กดปุ่ม &quot;เพิ่มคอนเสิร์ตใหม่&quot; เพื่อสร้างคอนเสิร์ต
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-800">
                      {event.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${
                          event.status === "PUBLISHED"
                            ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800"
                            : event.status === "ARCHIVED"
                              ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 border-neutral-300 dark:border-neutral-800"
                              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        {event.status === "PUBLISHED" && <CheckIcon className="w-2.5 h-2.5" />}
                        <span>
                          {event.status === "PUBLISHED"
                            ? "เปิดขายบัตร"
                            : event.status === "ARCHIVED"
                              ? "ปิดการแสดง (ARCHIVED)"
                              : "ร่าง (DRAFT)"}
                        </span>
                      </span>
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-1 bg-neutral-100 dark:bg-neutral-900 hover:bg-black dark:hover:bg-white text-neutral-700 dark:text-neutral-300 hover:text-white dark:hover:text-black border border-neutral-300 dark:border-neutral-800 rounded transition-colors inline-flex items-center gap-1 text-xs px-2"
                        title="แก้ไขคอนเสิร์ต"
                      >
                        <EditIcon className="w-3 h-3" />
                        <span>แก้ไข</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white line-clamp-1">{event.name}</h3>

                  <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <span>{event.eventDate} • {event.startTime} น.</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPinIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <span>{event.venue}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <TicketIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <span>ราคา: ฿{event.ticketPrice} | ขายแล้ว: {event.soldTickets}/{event.totalTickets} ใบ (เหลือ {event.availableTickets} ใบ)</span>
                    </p>
                  </div>

                  {/* Assigned Organizer Box */}
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 rounded space-y-0.5">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                      ผู้จัดงานที่รับผิดชอบสแกนบัตร (ASSIGNED ORGANIZER)
                    </span>
                    <p className="text-xs text-neutral-900 dark:text-white font-semibold flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{event.organizer.name}</span>
                      <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">({event.organizer.email})</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-900 flex justify-between items-center text-xs">
                  <a
                    href={`/events/${event.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span>ดูหน้าจำหน่ายบัตรจริง</span>
                    <ArrowRightIcon className="w-3 h-3" />
                  </a>
                  <span className="text-neutral-400 dark:text-neutral-600 font-mono text-[10px]">ID: {event.id.slice(-8)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add New Event */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-lg w-full p-6 space-y-5 my-8 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {editingEventId ? "แก้ไขข้อมูลคอนเสิร์ต & ปรับปรุงผู้จัด" : "เพิ่มคอนเสิร์ตใหม่ & มอบหมายผู้จัด"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white p-1"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-950 border border-red-700 rounded text-red-200 text-xs flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-3.5 h-3.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">ชื่อคอนเสิร์ต / งานแสดง *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น Summer Acoustic Night 2026"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">หมวดหมู่ *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    >
                      <option value="Indie Pop">Indie Pop</option>
                      <option value="Rock">Rock</option>
                      <option value="Acoustic">Acoustic</option>
                      <option value="EDM">EDM</option>
                      <option value="Jazz">Jazz</option>
                      <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">สถานะคอนเสิร์ต *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    >
                      <option value="PUBLISHED">เปิดขายบัตร (PUBLISHED)</option>
                      <option value="DRAFT">ร่าง (DRAFT)</option>
                      <option value="ARCHIVED">ปิดการแสดง (ARCHIVED)</option>
                    </select>
                  </div>
                </div>

                {formData.category === "อื่นๆ" && (
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">ระบุหมวดหมู่เอง</label>
                    <input
                      type="text"
                      required
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      placeholder="เช่น HipHop, Folk, Metal"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                )}

                {/* Organizer Selection (CRITICAL) */}
                <div className="space-y-1 p-3 bg-neutral-900/80 border border-neutral-800 rounded">
                  <label className="text-white font-bold flex items-center gap-1.5">
                    <TargetIcon className="w-3.5 h-3.5" />
                    <span>มอบหมายให้ผู้จัดงาน (ORGANIZER) รับผิดชอบ *</span>
                  </label>
                  <p className="text-[11px] text-neutral-400 mb-1.5">
                    ผู้จัดงานคนนี้จะเป็นเพียงคนเดียวที่สามารถล็อกอินเข้าสู่ระบบและสแกนบัตรงานนี้ได้
                  </p>
                  <select
                    required
                    value={formData.organizerId}
                    onChange={(e) => setFormData({ ...formData, organizerId: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white font-medium focus:outline-none focus:border-white"
                  >
                    {organizers.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">วันที่จัดงาน *</label>
                    <input
                      type="date"
                      required
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">เวลาเริ่มงาน *</label>
                    <input
                      type="text"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      placeholder="18:00"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                {/* Venue */}
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">สถานที่จัดงาน *</label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="เช่น River Warehouse, The Underground Club"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* Price & Tickets */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">ราคาบัตร (บาท) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.ticketPrice}
                      onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">จำนวนบัตรทั้งหมด *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.totalTickets}
                      onChange={(e) => setFormData({ ...formData, totalTickets: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">รายละเอียดงาน</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="รายละเอียดศิลปิน กำหนดการ และข้อมูลเพิ่มเติม"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white resize-none"
                  />
                </div>

                {/* Poster Image */}
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">รูปภาพโปสเตอร์ (URL หรือเลือกภาพตัวอย่าง)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="/poster-summer.svg หรือ URL"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          imageUrl:
                            formData.imageUrl === "/poster-summer.svg"
                              ? "/poster-indie.svg"
                              : "/poster-summer.svg",
                        })
                      }
                      className="px-2.5 py-1 bg-neutral-800 text-neutral-300 hover:text-white rounded whitespace-nowrap"
                    >
                      สลับภาพตัวอย่าง
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    <span>
                      {submitting
                        ? "กำลังบันทึก..."
                        : editingEventId
                          ? "บันทึกการแก้ไขคอนเสิร์ต"
                          : "บันทึกและสร้างคอนเสิร์ต"}
                    </span>
                    {!submitting && <ArrowRightIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
