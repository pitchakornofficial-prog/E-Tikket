"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { OrganizerNav } from "@/components/organizer-nav";
import {
  UsersIcon,
  UserIcon,
  TicketIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  CalendarIcon,
  QrCodeIcon,
} from "@/components/icons";

interface EventItem {
  id: string;
  name: string;
  eventDate: string;
  startTime: string;
  venue: string;
  status: string;
}

interface CheckerItem {
  id: string;
  name: string;
  gateNote: string | null;
  accessToken: string;
  isActive: boolean;
  createdAt: string;
  eventId: string;
  event: {
    id: string;
    name: string;
    eventDate: string;
    venue: string;
  };
  scansCount: number;
}

interface ScanRecord {
  id: string;
  eventId?: string;
  eventName?: string | null;
  action: "CHECK_IN" | "CHECK_OUT";
  result: "VALID" | "ALREADY_CHECKED_IN" | "INVALID_ACTION" | "CANCELLED" | "WRONG_EVENT" | "UNPAID" | "INVALID";
  scannedAt: string;
  ticketNumber: string | null;
  staffName: string;
  checkerName: string | null;
}

export default function OrganizerDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [scanFilterEventId, setScanFilterEventId] = useState<string>("ALL");
  const [checkers, setCheckers] = useState<CheckerItem[]>([]);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingScans, setLoadingScans] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal: Add Checker
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    eventId: "",
    gateNote: "",
  });
  const [addingSubmitting, setAddingSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Modal: QR & Link Sharing
  const [sharingChecker, setSharingChecker] = useState<CheckerItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal: Delete Checker
  const [deletingChecker, setDeletingChecker] = useState<CheckerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load events and checkers
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [eventsRes, checkersRes] = await Promise.all([
        fetch("/api/organizer/checkin/recent"),
        fetch("/api/organizer/checkers"),
      ]);

      if (!eventsRes.ok || !checkersRes.ok) {
        let msg = "เกิดข้อผิดพลาดในการโหลดข้อมูลผู้จัดงาน";
        if (eventsRes.status === 401 || checkersRes.status === 401) {
          msg = "เซสชันการเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
        } else if (eventsRes.status === 403 || checkersRes.status === 403) {
          msg = "บัญชีนี้ไม่มีสิทธิ์เข้าถึงในฐานะผู้จัดงาน (ORGANIZER)";
        } else {
          try {
            const errData = !checkersRes.ok ? await checkersRes.json() : await eventsRes.json();
            if (errData?.error?.message) msg = errData.error.message;
          } catch {
            // keep fallback
          }
        }
        setErrorMsg(msg);
        setLoading(false);
        return;
      }

      const eventsData = await eventsRes.json();
      const checkersData = await checkersRes.json();

      const evList = eventsData.events || [];
      setEvents(evList);
      setCheckers(checkersData.checkers || []);

      if (evList.length > 0) {
        setAddForm((prev) => (prev.eventId ? prev : { ...prev, eventId: evList[0].id }));
      }
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load recent scans
  const loadScans = useCallback(async (eventId?: string) => {
    setLoadingScans(true);
    try {
      const targetEventId = eventId || "ALL";
      const res = await fetch(`/api/organizer/checkin/recent?eventId=${encodeURIComponent(targetEventId)}`);
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch {
      // Ignore background error
    } finally {
      setLoadingScans(false);
    }
  }, []);

  useEffect(() => {
    loadScans(scanFilterEventId);
  }, [scanFilterEventId, loadScans]);

  // Handle Add Checker Submit
  const handleAddCheckerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSubmitting(true);
    setAddError(null);

    try {
      const res = await fetch("/api/organizer/checkers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error?.message || "ไม่สามารถเพิ่มเจ้าหน้าที่ตรวจบัตรได้");
        setAddingSubmitting(false);
        return;
      }

      // Add to list
      setCheckers((prev) => [data.checker, ...prev]);
      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        eventId: events.length > 0 ? events[0].id : "",
        gateNote: "",
      });
      setSuccessMsg(`เพิ่มเจ้าหน้าที่ตรวจบัตร "${data.checker.name}" สำเร็จ พร้อมสร้างลิงก์เข้าใช้งาน`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Immediately offer the QR / Link sharing modal
      handleOpenShareModal(data.checker);
    } catch {
      setAddError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setAddingSubmitting(false);
    }
  };

  // Handle Delete Checker
  const handleDeleteCheckerConfirm = async () => {
    if (!deletingChecker) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/organizer/checkers/${deletingChecker.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error?.message || "ไม่สามารถลบเจ้าหน้าที่ได้");
        setDeleting(false);
        return;
      }

      setCheckers((prev) => prev.filter((c) => c.id !== deletingChecker.id));
      setDeletingChecker(null);
      setSuccessMsg(data.message || "ลบเจ้าหน้าที่ตรวจบัตรและยกเลิกสิทธิ์สำเร็จ");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setDeleteError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setDeleting(false);
    }
  };

  // Open Share QR Modal
  const handleOpenShareModal = async (checker: CheckerItem) => {
    setSharingChecker(checker);
    const scannerUrl = typeof window !== "undefined"
      ? `${window.location.origin}/scanner/${checker.accessToken}`
      : `/scanner/${checker.accessToken}`;

    try {
      const dataUrl = await QRCode.toDataURL(scannerUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  };

  // Copy Link to clipboard
  const handleCopyLink = (token: string, checkerId: string) => {
    const scannerUrl = typeof window !== "undefined"
      ? `${window.location.origin}/scanner/${token}`
      : `/scanner/${token}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(scannerUrl);
      setCopiedId(checkerId);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  // Filter checkers
  const filteredCheckers = checkers.filter((c) => {
    if (selectedEventId !== "ALL" && c.eventId !== selectedEventId) return false;
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(query);
      const matchGate = c.gateNote ? c.gateNote.toLowerCase().includes(query) : false;
      const matchEvent = c.event.name.toLowerCase().includes(query);
      return matchName || matchGate || matchEvent;
    }
    return true;
  });

  const totalScans = checkers.reduce((acc, c) => acc + c.scansCount, 0);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans flex flex-col transition-colors duration-200">
      <OrganizerNav />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Header & Role Info */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-2">
                <UsersIcon className="w-3.5 h-3.5" />
                <span>ORGANIZER CONTROL PANEL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                ระบบจัดการเจ้าหน้าที่ตรวจบัตร (Gate Staff Management)
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                สร้างและแจกจ่ายลิงก์สำหรับเจ้าหน้าที่ตรวจบัตร (สแกนผ่านลิงก์เท่านั้น โดยผู้จัดงานไม่ต้องสแกนเอง)
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={events.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-bold text-xs sm:text-sm rounded-lg transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ เพิ่มเจ้าหน้าที่ตรวจบัตรใหม่</span>
            </button>
          </div>

          {/* Operational Policy Notice Box */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold">นโยบายความปลอดภัยการสแกนบัตร (Gate Staff Policy):</strong>
              <p className="text-amber-800 dark:text-amber-300">
                ผู้จัดงาน (Organizer) มีหน้าที่บริหารจัดการเจ้าหน้าที่และตรวจสอบสถิติเท่านั้น ไม่สามารถสแกนบัตรผ่านหน้านี้ได้โดยตรง กรุณาเพิ่มเจ้าหน้าที่ตรวจบัตรและแชร์ลิงก์เฉพาะ (Magic Link) หรือให้เจ้าหน้าที่สแกน QR Code เพื่อเปิดกล้องตรวจบัตรบนสมาร์ทโฟนของตนเอง
              </p>
            </div>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckIcon className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-800 dark:text-red-300">
            <AlertTriangleIcon className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">คอนเสิร์ตที่คุณดูแล</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">{events.length}</span>
              <span className="text-xs text-neutral-400">งาน</span>
            </div>
          </div>
          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">เจ้าหน้าที่ตรวจบัตรทั้งหมด</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">{checkers.length}</span>
              <span className="text-xs text-neutral-400">คน</span>
            </div>
          </div>
          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">ยอดสแกนสะสมจากเจ้าหน้าที่</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">{totalScans}</span>
              <span className="text-xs text-neutral-400">ครั้ง</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-neutral-500 shrink-0">เลือกงาน:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-black dark:focus:border-white w-full sm:w-64"
            >
              <option value="ALL">ทุกคอนเสิร์ตที่ดูแล</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.eventDate})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเจ้าหน้าที่, ประตู..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
        </div>

        {/* Section 1: Gate Staff Checkers List */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-neutral-500" />
              <span>รายชื่อเจ้าหน้าที่ตรวจบัตร (Gate Staff List)</span>
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              พบ {filteredCheckers.length} คน
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-6 h-6 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-500">กำลังโหลดรายชื่อเจ้าหน้าที่...</p>
            </div>
          ) : filteredCheckers.length === 0 ? (
            <div className="p-10 border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl text-center space-y-3">
              <UsersIcon className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                {checkers.length === 0
                  ? "ยังไม่มีเจ้าหน้าที่ตรวจบัตรในสังกัดของคุณ"
                  : "ไม่พบเจ้าหน้าที่ที่ตรงกับเงื่อนไขการค้นหา"}
              </p>
              {checkers.length === 0 && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-xs text-neutral-900 dark:text-white underline font-bold"
                >
                  กดที่นี่เพื่อเพิ่มเจ้าหน้าที่คนแรก
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCheckers.map((checker) => {
                const scannerUrl = typeof window !== "undefined"
                  ? `${window.location.origin}/scanner/${checker.accessToken}`
                  : `/scanner/${checker.accessToken}`;
                const isCopied = copiedId === checker.id;

                return (
                  <div
                    key={checker.id}
                    className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                          <h3 className="text-base font-bold text-neutral-900 dark:text-white line-clamp-1">
                            {checker.name}
                          </h3>
                        </div>
                        {checker.gateNote && (
                          <p className="text-xs text-neutral-500 font-medium pl-6">
                            จุดตรวจ / ประตู: <strong className="text-neutral-800 dark:text-neutral-200">{checker.gateNote}</strong>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => setDeletingChecker(checker)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                        title="ลบเจ้าหน้าที่"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Event & Scans Info */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-lg text-xs space-y-1 font-mono text-neutral-600 dark:text-neutral-400">
                      <p className="flex items-center gap-1.5 text-neutral-900 dark:text-white font-medium font-sans">
                        <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="line-clamp-1">{checker.event.name}</span>
                      </p>
                      <p className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800 text-[11px]">
                        <span>สถิติการสแกนบัตร:</span>
                        <strong className="text-neutral-900 dark:text-white text-xs">{checker.scansCount} ใบ</strong>
                      </p>
                    </div>

                    {/* Actions: Copy Link & Show QR Modal */}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(checker.accessToken, checker.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                          isCopied
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 border-transparent shadow-sm"
                        }`}
                      >
                        {isCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <TicketIcon className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "คัดลอกลิงก์แล้ว!" : "คัดลอกลิงก์สแกน"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenShareModal(checker)}
                        className="py-2 px-3 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        title="แสดง QR Code สำหรับมือถือ"
                      >
                        <QrCodeIcon className="w-3.5 h-3.5" />
                        <span>แสดง QR</span>
                      </button>

                      <a
                        href={scannerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-neutral-400 hover:text-black dark:hover:text-white rounded transition-colors"
                        title="เปิดหน้าสแกนเนอร์ในแท็บใหม่"
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Live Scan History & Audit Trail */}
        <section className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm space-y-0">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <TicketIcon className="w-4 h-4 text-neutral-500" />
                <span>ประวัติการสแกนบัตรล่าสุด (Live Scan Audit Trail)</span>
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                บันทึกการตรวจสอบบัตรแบบ Real-time พร้อมชื่อเจ้าหน้าที่ผู้ดำเนินการ
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={scanFilterEventId}
                onChange={(e) => setScanFilterEventId(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-black dark:focus:border-white max-w-[200px]"
              >
                <option value="ALL">ดูทุกคอนเสิร์ต (ALL)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => loadScans(scanFilterEventId)}
                disabled={loadingScans}
                className="p-1.5 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs inline-flex items-center gap-1 font-medium transition-colors shrink-0"
                title="รีเฟรชประวัติสแกน"
              >
                <RefreshCwIcon className={`w-3.5 h-3.5 ${loadingScans ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900 text-xs">
            {recentScans.length === 0 ? (
              <div className="p-10 text-center text-neutral-400 dark:text-neutral-500 font-mono">
                ยังไม่มีประวัติการสแกนบัตรสำหรับเงื่อนไขนี้
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/50 text-[10px] text-neutral-500 uppercase font-mono">
                    <th className="p-3">เวลาที่สแกน</th>
                    <th className="p-3">คอนเสิร์ต</th>
                    <th className="p-3">เจ้าหน้าที่ผู้สแกน</th>
                    <th className="p-3">เลขที่บัตร</th>
                    <th className="p-3">การกระทำ</th>
                    <th className="p-3">ผลการตรวจ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 font-mono text-xs">
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td className="p-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {new Date(scan.scannedAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-neutral-900 dark:text-white font-medium font-sans max-w-[140px] truncate" title={scan.eventName || undefined}>
                        {scan.eventName || "-"}
                      </td>
                      <td className="p-3 text-neutral-900 dark:text-white font-sans font-bold">
                        {scan.checkerName || scan.staffName || "-"}
                      </td>
                      <td className="p-3 text-neutral-800 dark:text-neutral-200 font-bold">
                        {scan.ticketNumber || <span className="text-neutral-400">-</span>}
                      </td>
                      <td className="p-3 text-neutral-700 dark:text-neutral-300">
                        {scan.action === "CHECK_IN" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">↘ เข้างาน</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">↗ ออกชั่วคราว</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            scan.result === "VALID"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                              : scan.result === "ALREADY_CHECKED_IN" || scan.result === "INVALID_ACTION"
                                ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                                : "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                          }`}
                        >
                          {scan.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 py-6 text-center text-xs text-neutral-500 font-mono">
        <p>E-Tikket Organizer Portal • Gate Staff Management</p>
      </footer>

      {/* Modal: Add Checker */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                <span>เพิ่มเจ้าหน้าที่ตรวจบัตรใหม่</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddCheckerSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  ชื่อเจ้าหน้าที่ตรวจบัตร *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="เช่น สมชาย (Gate A), Staff ฟ้า"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  เลือกคอนเสิร์ตที่รับผิดชอบ *
                </label>
                <select
                  required
                  value={addForm.eventId}
                  onChange={(e) => setAddForm({ ...addForm, eventId: e.target.value })}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-xs"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.eventDate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  จุดตรวจ / ประตู (Gate Position)
                </label>
                <input
                  type="text"
                  value={addForm.gateNote}
                  onChange={(e) => setAddForm({ ...addForm, gateNote: e.target.value })}
                  placeholder="เช่น ประตู 1, Gate VIP, ฝั่งทิศเหนือ"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white text-xs"
                />
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-700 dark:text-neutral-300">🔑 ไม่ต้องใช้รหัสผ่าน:</p>
                <p>ระบบจะสร้าง Token และ Magic Link สำหรับเข้าใช้งานกล้องสแกนบัตรโดยเฉพาะให้ทันที</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={addingSubmitting}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
                >
                  {addingSubmitting ? "กำลังบันทึก..." : "ยืนยันและสร้างลิงก์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR & Link Sharing */}
      {sharingChecker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <QrCodeIcon className="w-4 h-4" />
                <span>ลิงก์สแกนเนอร์สำหรับเจ้าหน้าที่</span>
              </h2>
              <button
                onClick={() => setSharingChecker(null)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-left">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{sharingChecker.name}</h3>
              <p className="text-xs text-neutral-500">
                งาน: {sharingChecker.event.name} {sharingChecker.gateNote && `• จุดตรวจ: ${sharingChecker.gateNote}`}
              </p>
            </div>

            {/* QR Code display */}
            <div className="p-4 bg-white rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center space-y-2">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Scanner QR Code" className="w-56 h-56 rounded-lg shadow-sm" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-neutral-400">
                  กำลังสร้าง QR Code...
                </div>
              )}
              <p className="text-[11px] text-neutral-500 font-sans">
                📱 ให้เจ้าหน้าที่ใช้มือถือสแกน QR Code นี้เพื่อเปิดหน้ากล้องตรวจบัตร
              </p>
            </div>

            {/* URL string & copy button */}
            <div className="space-y-2">
              <div className="p-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-[11px] font-mono text-neutral-800 dark:text-neutral-200 truncate select-all">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/scanner/${sharingChecker.accessToken}`
                  : `/scanner/${sharingChecker.accessToken}`}
              </div>

              <button
                onClick={() => handleCopyLink(sharingChecker.accessToken, sharingChecker.id)}
                className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                {copiedId === sharingChecker.id ? <CheckIcon className="w-4 h-4" /> : <TicketIcon className="w-4 h-4" />}
                <span>{copiedId === sharingChecker.id ? "คัดลอกลิงก์สำเร็จแล้ว!" : "คัดลอกลิงก์ส่งให้ Staff"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingChecker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangleIcon className="w-6 h-6" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">ยืนยันการลบเจ้าหน้าที่</h3>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                {deleteError}
              </div>
            )}

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              คุณต้องการลบเจ้าหน้าที่ <strong className="text-neutral-900 dark:text-white">&quot;{deletingChecker.name}&quot;</strong> หรือไม่? ลิงก์สแกนเนอร์ของเจ้าหน้าที่คนนี้จะถูกยกเลิกสิทธิ์ทันที
            </p>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                onClick={() => setDeletingChecker(null)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteCheckerConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold disabled:opacity-50"
              >
                {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
