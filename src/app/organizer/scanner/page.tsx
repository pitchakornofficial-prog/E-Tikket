"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { OrganizerNav } from "@/components/organizer-nav";
import {
  UsersIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
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
  phone: string | null;
  pin: string | null;
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
  attendeeName?: string | null;
  ticketTier?: string | null;
  gateNote?: string | null;
  checkerId?: string | null;
  staffName: string;
  checkerName: string | null;
}

interface AttendanceStats {
  totalSold: number;
  capacity: number;
  insideCount: number;
  outsideCount: number;
  allScansCount: number;
  checkInCount: number;
  checkOutCount: number;
  rejectedCount: number;
}

export default function OrganizerScannerPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [checkers, setCheckers] = useState<CheckerItem[]>([]);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalSold: 0,
    capacity: 0,
    insideCount: 0,
    outsideCount: 0,
    allScansCount: 0,
    checkInCount: 0,
    checkOutCount: 0,
    rejectedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingScans, setLoadingScans] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Scan Audit Stream Filters
  const [scanSearch, setScanSearch] = useState("");
  const [scanActionFilter, setScanActionFilter] = useState<"ALL" | "CHECK_IN" | "CHECK_OUT" | "REJECTED">("ALL");
  const [scanGateFilter, setScanGateFilter] = useState<string>("ALL");
  const [scanStaffFilter, setScanStaffFilter] = useState<string>("ALL");

  // Staff Search Filter
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  // Modal: Add Checker
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    eventId: "",
    gateNote: "",
    pin: "",
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

  // Status toggle in progress
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
          msg = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
        } else if (eventsRes.status === 403 || checkersRes.status === 403) {
          msg = "ไม่มีสิทธิ์เข้าถึงในฐานะผู้จัดงาน";
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

  // Load scans & stats
  const loadScans = useCallback(async (eventId?: string) => {
    setLoadingScans(true);
    try {
      const targetEventId = eventId || "ALL";
      const res = await fetch(`/api/organizer/checkin/recent?eventId=${encodeURIComponent(targetEventId)}`);
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      // Ignore background error
    } finally {
      setLoadingScans(false);
    }
  }, []);

  useEffect(() => {
    loadScans(selectedEventId);
  }, [selectedEventId, loadScans]);

  // Add Checker
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
        setAddError(data.error?.message || "ไม่สามารถเพิ่มเจ้าหน้าที่ได้");
        setAddingSubmitting(false);
        return;
      }

      setCheckers((prev) => [data.checker, ...prev]);
      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        phone: "",
        eventId: events.length > 0 ? events[0].id : "",
        gateNote: "",
        pin: "",
      });
      setSuccessMsg(`เพิ่มเจ้าหน้าที่ "${data.checker.name}" เรียบร้อยแล้ว พร้อมรหัส PIN และสิทธิ์สแกน`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Open share modal immediately
      handleOpenShareModal(data.checker);
    } catch {
      setAddError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setAddingSubmitting(false);
    }
  };

  // Toggle staff active/revoked status
  const handleToggleStaffStatus = async (checker: CheckerItem) => {
    setTogglingId(checker.id);
    try {
      const newStatus = !checker.isActive;
      const res = await fetch(`/api/organizer/checkers/${checker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        setCheckers((prev) =>
          prev.map((c) => (c.id === checker.id ? { ...c, isActive: newStatus } : c))
        );
        setSuccessMsg(data.message || (newStatus ? "เปิดสิทธิ์ใช้งานสำเร็จ" : "ระงับสิทธิ์สำเร็จ"));
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error?.message || "ไม่สามารถเปลี่ยนสถานะได้");
      }
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Checker
  const handleDeleteCheckerConfirm = async () => {
    if (!deletingChecker) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/organizer/checkers/${deletingChecker.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || "ไม่สามารถลบเจ้าหน้าที่ได้");
        setDeleting(false);
        return;
      }

      setCheckers((prev) => prev.filter((c) => c.id !== deletingChecker.id));
      setDeletingChecker(null);
      setSuccessMsg(data.message || "ลบเจ้าหน้าที่ตรวจบัตรสำเร็จ");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
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

  // Distinct gates from checkers and scans for filter dropdown
  const distinctGates = useMemo(() => {
    const gates = new Set<string>();
    checkers.forEach((c) => {
      if (c.gateNote) gates.add(c.gateNote);
    });
    recentScans.forEach((s) => {
      if (s.gateNote) gates.add(s.gateNote);
    });
    return Array.from(gates);
  }, [checkers, recentScans]);

  // Distinct staff names
  const distinctStaff = useMemo(() => {
    const staffMap = new Map<string, string>();
    checkers.forEach((c) => {
      staffMap.set(c.id, c.name);
    });
    recentScans.forEach((s) => {
      if (s.checkerId && s.checkerName) {
        staffMap.set(s.checkerId, s.checkerName);
      }
    });
    return Array.from(staffMap.entries()).map(([id, name]) => ({ id, name }));
  }, [checkers, recentScans]);

  // Filtered checkers
  const filteredCheckers = useMemo(() => {
    return checkers.filter((c) => {
      if (selectedEventId !== "ALL" && c.eventId !== selectedEventId) return false;
      if (staffSearchQuery.trim() !== "") {
        const q = staffSearchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone ? c.phone.toLowerCase().includes(q) : false;
        const matchGate = c.gateNote ? c.gateNote.toLowerCase().includes(q) : false;
        const matchEvent = c.event.name.toLowerCase().includes(q);
        return matchName || matchPhone || matchGate || matchEvent;
      }
      return true;
    });
  }, [checkers, selectedEventId, staffSearchQuery]);

  // Filtered scans
  const filteredScans = useMemo(() => {
    return recentScans.filter((scan) => {
      // 1. Search Query
      if (scanSearch.trim() !== "") {
        const q = scanSearch.toLowerCase().trim();
        const matchTicket = scan.ticketNumber ? scan.ticketNumber.toLowerCase().includes(q) : false;
        const matchAttendee = scan.attendeeName ? scan.attendeeName.toLowerCase().includes(q) : false;
        const matchStaff = scan.staffName ? scan.staffName.toLowerCase().includes(q) : false;
        const matchEvent = scan.eventName ? scan.eventName.toLowerCase().includes(q) : false;
        if (!matchTicket && !matchAttendee && !matchStaff && !matchEvent) {
          return false;
        }
      }

      // 2. Action Filter Pill
      if (scanActionFilter === "CHECK_IN" && scan.action !== "CHECK_IN") return false;
      if (scanActionFilter === "CHECK_OUT" && scan.action !== "CHECK_OUT") return false;
      if (scanActionFilter === "REJECTED" && scan.result === "VALID") return false;

      // 3. Gate Filter
      if (scanGateFilter !== "ALL" && scan.gateNote !== scanGateFilter) return false;

      // 4. Staff Filter
      if (scanStaffFilter !== "ALL") {
        if (scan.checkerId !== scanStaffFilter && scan.staffName !== scanStaffFilter) {
          return false;
        }
      }

      return true;
    });
  }, [recentScans, scanSearch, scanActionFilter, scanGateFilter, scanStaffFilter]);

  const resetScanFilters = () => {
    setScanSearch("");
    setScanActionFilter("ALL");
    setScanGateFilter("ALL");
    setScanStaffFilter("ALL");
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors">
      <OrganizerNav />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-2">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>GATE DELEGATION & SCAN AUDIT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
              จัดการเจ้าหน้าที่สแกนบัตร & ประวัติการสแกน (Gate Staff & Scan Audit)
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              ผู้จัดมีหน้าที่เพิ่มเจ้าหน้าที่และออกสิทธิ์เข้าใช้งานเท่านั้น เจ้าหน้าที่ทำได้เฉพาะสแกนบัตรหน้างาน และผู้จัดสามารถดูประวัติการสแกนพร้อมตัวกรองได้
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">เลือกคอนเสิร์ต:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-white font-bold shadow-sm"
            >
              <option value="ALL">ทุกคอนเสิร์ต (All Events)</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.eventDate})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckIcon className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
            <AlertTriangleIcon className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Attendance Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">ยอดผู้ซื้อบัตรทั้งหมด (Total Attendees)</span>
            <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
              {stats.totalSold}{" "}
              <span className="text-sm font-normal text-neutral-400">/ {stats.capacity} ใบ</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {stats.capacity > 0
                ? `จำหน่ายแล้ว ${((stats.totalSold / stats.capacity) * 100).toFixed(1)}% • ว่าง ${stats.capacity - stats.totalSold} ใบ`
                : "ไม่มีโควตาเปิดขาย"}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">เช็คอินอยู่ในงาน (INSIDE)</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {stats.insideCount} <span className="text-sm font-normal text-neutral-400">คน</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.totalSold > 0
                ? `${((stats.insideCount / stats.totalSold) * 100).toFixed(1)}% ของผู้ซื้อเข้างานแล้ว`
                : "ยังไม่มีผู้เข้างาน"}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">ยังไม่มา / ออกชั่วคราว (OUTSIDE)</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
              {stats.outsideCount} <span className="text-sm font-normal text-neutral-400">คน</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              สามารถสแกนเข้างาน หรือกลับเข้างานได้
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">สถิติการสแกนทั้งหมด (Total Scans)</span>
            <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
              {stats.allScansCount} <span className="text-sm font-normal text-neutral-400">ครั้ง</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              เข้า {stats.checkInCount} • ออก {stats.checkOutCount} • ปฏิเสธ {stats.rejectedCount}
            </p>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: Gate Staff Delegation (ผู้จัดมีหน้าที่เพิ่มเจ้าหน้าที่ได้อย่างเดียว)
           ========================================================================= */}
        <section className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                  1. จัดการรายชื่อเจ้าหน้าที่สแกนบัตร (Gate Staff Management)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                  ผู้จัดเพิ่มสิทธิ์อย่างเดียว
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                ผู้จัดงานมีหน้าที่เพิ่มเจ้าหน้าที่และออกลิงก์ Token เฉพาะจุดตรวจ โดย<strong>เจ้าหน้าที่สามารถทำได้แค่สแกนบัตรเข้า-ออกเท่านั้น</strong> ไม่สามารถดูยอดเงิน รายรับ หรือข้อมูลส่วนตัวของลูกค้ารายอื่นได้
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={events.length === 0}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ เพิ่มเจ้าหน้าที่สแกนบัตร</span>
            </button>
          </div>

          {/* Security Restriction Box */}
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-xl flex items-start gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
            <AlertTriangleIcon className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <div>
              <strong>ขอบเขตสิทธิ์เจ้าหน้าที่ (Staff Restriction Policy):</strong> เมื่อเจ้าหน้าที่เปิดลิงก์บนสมาร์ตโฟน จะเข้าสู่หน้าจอเปิดกล้องสแกนเนอร์ (<code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px]">/scanner/[token]</code>) ทันที โดยระบบจำกัดสิทธิ์ให้ทำได้เพียง <em>&quot;สแกนบัตรตรวจคนเข้า-ออก&quot;</em> เท่านั้น ไม่สามารถดูข้อมูลหลังบ้านหรือสถิติการเงินใดๆ ได้ทั้งสิ้น
            </div>
          </div>

          {/* Staff Search bar */}
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={staffSearchQuery}
              onChange={(e) => setStaffSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเจ้าหน้าที่, เบอร์โทร, หรือจุดตรวจประตู..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          {/* Staff Table */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">รหัส</th>
                    <th className="py-3 px-4">ชื่อเจ้าหน้าที่</th>
                    <th className="py-3 px-4">ประตู / จุดตรวจ</th>
                    <th className="py-3 px-4">ลิงก์สแกนเนอร์ & PIN</th>
                    <th className="py-3 px-4">ยอดสแกน</th>
                    <th className="py-3 px-4">สถานะสิทธิ์</th>
                    <th className="py-3 px-4 text-right">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        กำลังโหลดข้อมูลเจ้าหน้าที่...
                      </td>
                    </tr>
                  ) : filteredCheckers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        {checkers.length === 0
                          ? "ยังไม่มีเจ้าหน้าที่สแกนบัตร กรุณากดปุ่ม '+ เพิ่มเจ้าหน้าที่สแกนบัตร' ด้านบน"
                          : "ไม่พบเจ้าหน้าที่ที่ตรงกับเงื่อนไขการค้นหา"}
                      </td>
                    </tr>
                  ) : (
                    filteredCheckers.map((checker, idx) => {
                      const scannerUrl = typeof window !== "undefined"
                        ? `${window.location.origin}/scanner/${checker.accessToken}`
                        : `/scanner/${checker.accessToken}`;
                      const isCopied = copiedId === checker.id;

                      return (
                        <tr
                          key={checker.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                        >
                          {/* Staff ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-200 whitespace-nowrap">
                            #STF-0{idx + 1}
                          </td>

                          {/* Name & Phone */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-neutral-900 dark:text-white">
                              {checker.name}
                            </div>
                            {checker.phone && (
                              <div className="text-neutral-500 text-[11px] font-mono">
                                📞 {checker.phone}
                              </div>
                            )}
                          </td>

                          {/* Gate */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold border border-neutral-200 dark:border-neutral-700">
                              {checker.gateNote || "ประตูทั่วไป"}
                            </span>
                          </td>

                          {/* Link & PIN */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
                                .../scanner/{checker.accessToken.slice(0, 8)}
                              </span>
                              {checker.pin && (
                                <span className="font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                  PIN {checker.pin}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Scans Count */}
                          <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                            {checker.scansCount} ครั้ง
                          </td>

                          {/* Active Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                checker.isActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {checker.isActive ? "ใช้งานได้ (ACTIVE)" : "ระงับสิทธิ์ (REVOKED)"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(checker.accessToken, checker.id)}
                              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-[11px] font-semibold transition"
                            >
                              {isCopied ? "คัดลอกแล้ว!" : "คัดลอกลิงก์"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenShareModal(checker)}
                              className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-[11px] font-semibold transition"
                              title="ดู QR Code"
                            >
                              QR ↗
                            </button>

                            <a
                              href={scannerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-[11px] font-semibold transition inline-block"
                              title="ดูหน้าจอเครื่องสแกน"
                            >
                              ดูหน้าสแกน ↗
                            </a>

                            <button
                              type="button"
                              disabled={togglingId === checker.id}
                              onClick={() => handleToggleStaffStatus(checker)}
                              className={`px-2 py-1 rounded border text-[11px] font-semibold transition ${
                                checker.isActive
                                  ? "text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                                  : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
                              }`}
                            >
                              {togglingId === checker.id
                                ? "..."
                                : checker.isActive
                                ? "ระงับสิทธิ์"
                                : "เปิดสิทธิ์"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingChecker(checker)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded transition"
                              title="ลบเจ้าหน้าที่"
                            >
                              <TrashIcon className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: Scan Audit History with Advanced Multi-Dimensional Filters
           ========================================================================= */}
        <section className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white">
                  2. ประวัติการสแกนบัตรแบบเรียลไทม์ (Live Scan Audit Stream)
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>สด Real-time</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                ผู้จัดงานสามารถตรวจสอบประวัติการสแกนของเจ้าหน้าที่ทุกประตูได้แบบ Real-time พร้อมตัวกรองครบวงจร
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadScans(selectedEventId)}
              disabled={loadingScans}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${loadingScans ? "animate-spin" : ""}`} />
              <span>{loadingScans ? "กำลังโหลด..." : "รีเฟรชประวัติสแกน"}</span>
            </button>
          </div>

          {/* Multi-Dimensional Filter Bar */}
          <div className="bg-neutral-50 dark:bg-neutral-900/60 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            {/* Row 1: Search & Result Status Filter Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={scanSearch}
                  onChange={(e) => setScanSearch(e.target.value)}
                  placeholder="ค้นหาด้วยรหัสตั๋ว (TK-...), ชื่อผู้ถือบัตร, หรือชื่อเจ้าหน้าที่..."
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setScanActionFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    scanActionFilter === "ALL"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                      : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  ทั้งหมด ({recentScans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScanActionFilter("CHECK_IN")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    scanActionFilter === "CHECK_IN"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                      : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  เข้างาน CHECK_IN ({recentScans.filter((s) => s.action === "CHECK_IN").length})
                </button>
                <button
                  type="button"
                  onClick={() => setScanActionFilter("CHECK_OUT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    scanActionFilter === "CHECK_OUT"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                      : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  ออกชั่วคราว CHECK_OUT ({recentScans.filter((s) => s.action === "CHECK_OUT").length})
                </button>
                <button
                  type="button"
                  onClick={() => setScanActionFilter("REJECTED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    scanActionFilter === "REJECTED"
                      ? "bg-rose-600 text-white"
                      : "bg-white dark:bg-neutral-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                  }`}
                >
                  ถูกปฏิเสธ REJECTED ({recentScans.filter((s) => s.result !== "VALID").length})
                </button>
              </div>
            </div>

            {/* Row 2: Gate dropdown, Staff dropdown, and Reset */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium">จุดตรวจ / ประตู:</span>
                <select
                  value={scanGateFilter}
                  onChange={(e) => setScanGateFilter(e.target.value)}
                  className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white"
                >
                  <option value="ALL">ทุกประตู (All Gates)</option>
                  {distinctGates.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium">เจ้าหน้าที่ผู้สแกน:</span>
                <select
                  value={scanStaffFilter}
                  onChange={(e) => setScanStaffFilter(e.target.value)}
                  className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white"
                >
                  <option value="ALL">เจ้าหน้าที่ทั้งหมด (All Staff)</option>
                  {distinctStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={resetScanFilters}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline text-xs ml-auto"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          {/* Results Count Banner */}
          <div className="flex justify-between items-center text-xs text-neutral-500">
            <div>
              แสดง <strong className="text-neutral-900 dark:text-white font-mono">{filteredScans.length}</strong> จากทั้งหมด {recentScans.length} รายการสแกน
            </div>
          </div>

          {/* Audit Stream Table */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">เวลาสแกน</th>
                    <th className="py-3 px-4">เหตุการณ์</th>
                    <th className="py-3 px-4">ผู้ถือตั๋ว & ประเภท</th>
                    <th className="py-3 px-4">รหัสตั๋ว (Ticket #)</th>
                    <th className="py-3 px-4">จุดตรวจ / ประตู</th>
                    <th className="py-3 px-4">เจ้าหน้าที่ผู้สแกน</th>
                    <th className="py-3 px-4">ผลการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                  {loadingScans ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        กำลังโหลดประวัติการสแกน...
                      </td>
                    </tr>
                  ) : filteredScans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        ยังไม่มีข้อมูลการสแกนที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredScans.map((scan) => (
                      <tr
                        key={scan.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="font-mono font-bold text-neutral-900 dark:text-neutral-200">
                            {new Date(scan.scannedAt).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {new Date(scan.scannedAt).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                              scan.action === "CHECK_IN"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-neutral-900 text-white dark:bg-white dark:text-black"
                            }`}
                          >
                            {scan.action}
                          </span>
                        </td>

                        {/* Attendee Name & Tier */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-neutral-900 dark:text-white">
                            {scan.attendeeName || "ไม่ระบุชื่อ"}
                          </div>
                          <div className="mt-0.5">
                            {scan.ticketTier === "STUDENT" ? (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                ส่วนลดนักศึกษา @ubu
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                บัตรทั่วไป
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ticket Number */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap font-mono font-bold text-neutral-900 dark:text-white">
                          {scan.ticketNumber || "-"}
                        </td>

                        {/* Gate Station */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="text-neutral-800 dark:text-neutral-200">
                            {scan.gateNote || "ประตูหลัก"}
                          </span>
                        </td>

                        {/* Staff */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="font-bold text-neutral-900 dark:text-white">
                            {scan.staffName}
                          </div>
                        </td>

                        {/* Verification Result */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {scan.result === "VALID" ? (
                            scan.action === "CHECK_IN" ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ ผ่านเข้างาน (INSIDE)
                              </span>
                            ) : (
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                🚪 ออกชั่วคราว (OUTSIDE)
                              </span>
                            )
                          ) : (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              ❌ {scan.result}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Modal: Add Gate Staff */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  <span>เพิ่มเจ้าหน้าที่สแกนบัตร (Gate Staff)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {addError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
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
                    placeholder="เช่น สมศักดิ์ (Staff), อภิชัย วงศ์ษา"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="เช่น 081-445-9988"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-black dark:focus:border-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">
                    จุดตรวจ / ประตู (Gate Station)
                  </label>
                  <input
                    type="text"
                    value={addForm.gateNote}
                    onChange={(e) => setAddForm({ ...addForm, gateNote: e.target.value })}
                    placeholder="เช่น Gate 1 (Riverfront Main), Gate 2, VIP Gate"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">
                    รหัส PIN 4 หลัก (เว้นว่างเพื่อสุ่มอัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={addForm.pin}
                    onChange={(e) => setAddForm({ ...addForm, pin: e.target.value })}
                    placeholder="เช่น 8492"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white font-mono tracking-widest text-xs"
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
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-xs"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.eventDate})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={addingSubmitting}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {addingSubmitting ? "กำลังบันทึก..." : "ยืนยันและออกสิทธิ์"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: QR & Link Sharing */}
        {sharingChecker && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <QrCodeIcon className="w-4 h-4" />
                  <span>ลิงก์สแกนเนอร์สำหรับเจ้าหน้าที่</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setSharingChecker(null)}
                  className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="text-left space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{sharingChecker.name}</h3>
                <p className="text-xs text-neutral-500">
                  จุดตรวจ: <strong>{sharingChecker.gateNote || "ประตูหลัก"}</strong>
                </p>
                {sharingChecker.pin && (
                  <p className="text-xs text-neutral-500">
                    รหัส PIN: <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">{sharingChecker.pin}</strong>
                  </p>
                )}
              </div>

              {/* QR Code Container */}
              {qrDataUrl && (
                <div className="bg-white p-3 rounded-xl border border-neutral-200 inline-block shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Scanner Link QR" className="w-52 h-52 mx-auto" />
                </div>
              )}

              <p className="text-[11px] text-neutral-400">
                ให้เจ้าหน้าที่ใช้สมาร์ตโฟนสแกน QR เพื่อเปิดหน้าสแกนเนอร์กล้องทันที
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(sharingChecker.accessToken, sharingChecker.id)}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black font-bold text-xs rounded-lg transition shadow-sm"
                >
                  {copiedId === sharingChecker.id ? "✓ คัดลอกลิงก์แล้ว!" : "คัดลอกลิงก์สแกนเนอร์"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {deletingChecker && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  ยืนยันลบเจ้าหน้าที่?
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  ต้องการลบ &quot;{deletingChecker.name}&quot; หรือไม่? ลิงก์สแกนเนอร์ของเจ้าหน้าที่คนนี้จะถูกยกเลิกทันที
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingChecker(null)}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCheckerConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
