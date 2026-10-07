"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import {
  UsersIcon,
  UserIcon,
  MusicIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ArrowRightIcon,
  QrCodeIcon,
} from "@/components/icons";

interface AssignedEvent {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  eventDate: string;
  venue: string;
}

interface OrganizerItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  events: AssignedEvent[];
  _count: {
    events: number;
    scans: number;
  };
}

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal state
  const [editingOrganizer, setEditingOrganizer] = useState<OrganizerItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    newPassword: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal state
  const [deletingOrganizer, setDeletingOrganizer] = useState<OrganizerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchOrganizers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/organizers");
      if (!res.ok) {
        setErrorMsg("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ดูแลคอนเสิร์ต");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setOrganizers(data.organizers || []);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (createForm.password.length < 6) {
      setCreateError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error?.message || "ไม่สามารถสร้างบัญชีผู้ดูแลได้");
        return;
      }

      setSuccessMsg(`สร้างบัญชีผู้ดูแล "${createForm.name}" เรียบร้อยแล้ว`);
      setIsCreateModalOpen(false);
      setCreateForm({ name: "", email: "", password: "", confirmPassword: "" });
      fetchOrganizers();
    } catch {
      setCreateError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (org: OrganizerItem) => {
    setEditingOrganizer(org);
    setEditForm({
      name: org.name,
      email: org.email,
      newPassword: "",
    });
    setEditError(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrganizer) return;
    setEditError(null);

    if (editForm.newPassword && editForm.newPassword.length < 6) {
      setEditError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/admin/organizers/${editingOrganizer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          password: editForm.newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error?.message || "ไม่สามารถบันทึกข้อมูลได้");
        return;
      }

      setSuccessMsg(`อัปเดตข้อมูลผู้ดูแล "${editForm.name}" สำเร็จแล้ว`);
      setEditingOrganizer(null);
      fetchOrganizers();
    } catch {
      setEditError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Delete Organizer
  const handleDeleteSubmit = async () => {
    if (!deletingOrganizer) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/organizers/${deletingOrganizer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error?.message || "ไม่สามารถลบผู้ดูแลได้");
        return;
      }

      setSuccessMsg(`ลบบัญชีผู้ดูแล "${deletingOrganizer.name}" เรียบร้อยแล้ว`);
      setDeletingOrganizer(null);
      fetchOrganizers();
    } catch {
      setDeleteError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setDeleting(false);
    }
  };

  // Calculate statistics
  const totalOrganizers = organizers.length;
  const totalAssignedEvents = organizers.reduce((acc, curr) => acc + curr._count.events, 0);
  const totalScans = organizers.reduce((acc, curr) => acc + curr._count.scans, 0);

  // Filtered organizers
  const filteredOrganizers = organizers.filter((org) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const matchesName = org.name.toLowerCase().includes(q);
    const matchesEmail = org.email.toLowerCase().includes(q);
    const matchesEvents = org.events.some((e) => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
    return matchesName || matchesEmail || matchesEvents;
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      <AdminNav />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 dark:border-neutral-900 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-neutral-900 dark:text-white" />
              <span>จัดการผู้ดูแลคอนเสิร์ต (Organizers & Staff)</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              สร้างบัญชี กำหนดรหัสผ่าน และตรวจสอบคอนเสิร์ตที่มอบหมายให้ผู้ดูแลแต่ละท่านรับผิดชอบสแกนบัตร
            </p>
          </div>
          <button
            onClick={() => {
              setCreateForm({ name: "", email: "", password: "", confirmPassword: "" });
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>+</span>
            <span>เพิ่มผู้ดูแลใหม่</span>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">ผู้ดูแลคอนเสิร์ตทั้งหมด</span>
              <UserIcon className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-2 font-mono">{totalOrganizers}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">มีสิทธิ์ล็อกอินสแกนตั๋วหน้างาน</p>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">คอนเสิร์ตที่มอบหมาย</span>
              <MusicIcon className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-2 font-mono">{totalAssignedEvents}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">รวมทุกคอนเสิร์ตที่มีผู้จัดดูแล</p>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">สแกนบัตรสะสม</span>
              <QrCodeIcon className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-2 font-mono">{totalScans}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">ครั้งที่มีการเช็คอิน/เช็คเอาท์</p>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-950 p-4 border border-neutral-200 dark:border-neutral-900 rounded-lg shadow-sm">
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
              <SearchIcon className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ดูแล, อีเมล, หรือชื่องานที่รับผิดชอบ..."
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
            <span>แสดง {filteredOrganizers.length} จาก {organizers.length} ท่าน</span>
          </div>
        </div>

        {/* Organizers List */}
        {loading ? (
          <div className="text-center py-16 space-y-2">
            <div className="w-6 h-6 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">กำลังโหลดรายชื่อผู้ดูแลคอนเสิร์ต...</p>
          </div>
        ) : filteredOrganizers.length === 0 ? (
          <div className="p-12 border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-950/40 rounded-lg text-center space-y-2">
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">ไม่พบผู้ดูแลคอนเสิร์ตที่ตรงกับการค้นหา</p>
            <button
              onClick={() => {
                setCreateForm({ name: "", email: "", password: "", confirmPassword: "" });
                setCreateError(null);
                setIsCreateModalOpen(true);
              }}
              className="text-xs text-neutral-500 dark:text-neutral-400 underline hover:text-black dark:hover:text-white cursor-pointer"
            >
              กดปุ่ม &quot;เพิ่มผู้ดูแลใหม่&quot; เพื่อสร้างบัญชี
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrganizers.map((org) => (
              <div
                key={org.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors shadow-sm"
              >
                <div className="space-y-3">
                  {/* Organizer Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                          {org.name}
                        </h3>
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {org.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-1.5 bg-neutral-100 dark:bg-neutral-900 hover:bg-black dark:hover:bg-white text-neutral-700 dark:text-neutral-300 hover:text-white dark:hover:text-black border border-neutral-300 dark:border-neutral-800 rounded transition-colors inline-flex items-center gap-1 text-xs px-2"
                        title="แก้ไขข้อมูล / รีเซ็ตรหัสผ่าน"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        onClick={() => {
                          setDeletingOrganizer(org);
                          setDeleteError(null);
                        }}
                        className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 border border-red-200 dark:border-red-900/60 rounded transition-colors inline-flex items-center gap-1 text-xs px-2"
                        title="ลบบัญชีผู้ดูแล"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-800">
                      ดูแล {org._count.events} คอนเสิร์ต
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-800">
                      สแกนบัตร {org._count.scans} ครั้ง
                    </span>
                  </div>

                  {/* Assigned Concerts List */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                    <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      คอนเสิร์ตที่รับผิดชอบสแกนบัตร:
                    </p>
                    {org.events.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic">
                        ยังไม่ได้รับมอบหมายคอนเสิร์ตใด (ไปที่เมนู &quot;จัดการคอนเสิร์ต&quot; เพื่อมอบหมายงาน)
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {org.events.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2 bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800/80 rounded flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-neutral-900 dark:text-white truncate">
                                {ev.name}
                              </p>
                              <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                                <CalendarIcon className="w-3 h-3" />
                                <span>{ev.eventDate} • {ev.venue}</span>
                              </p>
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 border ${
                                ev.status === "PUBLISHED"
                                  ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800"
                                  : ev.status === "ARCHIVED"
                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
                              }`}
                            >
                              {ev.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-900 flex justify-between items-center text-xs text-neutral-400 font-mono text-[11px]">
                  <span>สร้างเมื่อ: {org.createdAt.split("T")[0]}</span>
                  <Link
                    href={`/admin/events?search=${encodeURIComponent(org.name)}`}
                    className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span>ค้นหาคอนเสิร์ตที่ดูแล</span>
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Organizer */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-5 my-8 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-neutral-900 dark:text-white" />
                  <span>เพิ่มผู้ดูแลคอนเสิร์ตใหม่</span>
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white p-1"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {createError && (
                <div className="p-3 bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-xs flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-3.5 h-3.5" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">ชื่อ - นามสกุล / ชื่อผู้ดูแล *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="เช่น สมชาย ใจดี หรือ ทีมงานสแกนบัตร"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">อีเมลสำหรับเข้าสู่ระบบ *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="organizer@example.com"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  <p className="text-[10px] text-neutral-400">ใช้อีเมลนี้ล็อกอินเข้าสู่ระบบผู้จัดงานที่หน้า /login</p>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">รหัสผ่านเริ่มต้น *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="•••••••• (อย่างน้อย 6 ตัวอักษร)"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">ยืนยันรหัสผ่าน *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-500 dark:text-neutral-400">
                  💡 <strong>คำแนะนำ:</strong> เมื่อสร้างบัญชีแล้ว สามารถไปที่เมนู &quot;จัดการคอนเสิร์ต&quot; เพื่อมอบหมายให้ผู้ดูแลท่านนี้รับผิดชอบคอนเสิร์ตที่ต้องการได้ทันที
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createSubmitting}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {createSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชีผู้ดูแล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Organizer */}
        {editingOrganizer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-5 my-8 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <EditIcon className="w-5 h-5 text-neutral-900 dark:text-white" />
                  <span>แก้ไขข้อมูลผู้ดูแลคอนเสิร์ต</span>
                </h2>
                <button
                  onClick={() => setEditingOrganizer(null)}
                  className="text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white p-1"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-700 rounded text-red-800 dark:text-red-200 text-xs flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-3.5 h-3.5" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">อีเมลเข้าสู่ระบบ *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-700 dark:text-neutral-300 font-medium">
                    รีเซ็ตรหัสผ่านใหม่ (ไม่ระบุหากไม่ต้องการเปลี่ยน)
                  </label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrganizer(null)}
                    disabled={editSubmitting}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {editSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Organizer */}
        {deletingOrganizer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-500 dark:text-red-400">
                <AlertTriangleIcon className="w-6 h-6 shrink-0" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">ยืนยันการลบบัญชีผู้ดูแล</h2>
              </div>

              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ดูแล{" "}
                <span className="font-bold text-black dark:text-white">&quot;{deletingOrganizer.name}&quot;</span> ({deletingOrganizer.email})?
              </p>

              {deleteError ? (
                <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                  {deleteError}
                </div>
              ) : deletingOrganizer._count.events > 0 ? (
                <div className="p-3 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ ผู้ดูแลท่านนี้ยังมีคอนเสิร์ตที่รับผิดชอบอยู่ <strong>{deletingOrganizer._count.events} งาน</strong> จะไม่สามารถลบได้จนกว่าจะมอบหมายให้ผู้อื่นในหน้า &quot;จัดการคอนเสิร์ต&quot;
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  การกระทำนี้จะลบบัญชีออกจากระบบอย่างถาวร
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingOrganizer(null);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={deleting || deletingOrganizer._count.events > 0}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "กำลังลบ..." : "ยืนยันลบบัญชี"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
