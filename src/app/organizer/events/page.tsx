"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { OrganizerNav } from "@/components/organizer-nav";
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  TicketIcon,
  SearchIcon,
  RefreshCwIcon,
  UsersIcon,
  DownloadIcon,
  XIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@/components/icons";

interface EventSummary {
  id: string;
  name: string;
  description: string;
  venue: string;
  eventDate: string;
  startTime: string;
  ticketPrice: number;
  totalTickets: number;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  imageUrl: string;
  createdAt: string;
  soldTickets: number;
  insideCount: number;
  totalRevenue: number;
  organizerRevenue: number;
  checkersCount: number;
}

interface OverallSummary {
  totalEvents: number;
  totalSoldTickets: number;
  totalOrganizerRevenue: number;
  totalRevenue: number;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  status: "OUTSIDE" | "INSIDE" | "CANCELLED";
}

interface OrderDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  totalAmount: number;
  organizerRevenue: number;
  status: "PENDING_PAYMENT" | "WAITING_FOR_VERIFY" | "PAID" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  tickets: TicketItem[];
}

interface EventDetailResponse {
  event: EventSummary;
  stats: {
    soldTickets: number;
    totalTickets: number;
    totalRevenue: number;
    organizerRevenue: number;
    insideCount: number;
    outsideCount: number;
    cancelledCount: number;
    checkinRatePercent: string;
  };
  orders: OrderDetail[];
}

export default function OrganizerEventsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [summary, setSummary] = useState<OverallSummary>({
    totalEvents: 0,
    totalSoldTickets: 0,
    totalOrganizerRevenue: 0,
    totalRevenue: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Event Details Modal state
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<EventDetailResponse | null>(null);

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  // Fetch all organizer events
  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/organizer/events", {
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        let msg = "เกิดข้อผิดพลาดในการโหลดข้อมูลคอนเสิร์ต";
        try {
          const errData = await res.json();
          if (errData.error) msg = errData.error;
        } catch {
          // fallback
        }
        setErrorMsg(msg);
        return;
      }

      const data = await res.json();
      setEvents(data.events || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Fetch single event details for modal
  const openEventModal = useCallback(async (eventId: string) => {
    setActiveEventId(eventId);
    setModalLoading(true);
    setModalError(null);
    setModalData(null);
    setOrderSearch("");
    setOrderStatusFilter("ALL");

    try {
      const res = await fetch(`/api/organizer/events/${eventId}`, {
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        let msg = "เกิดข้อผิดพลาดในการโหลดรายละเอียด";
        try {
          const errData = await res.json();
          if (errData.error) msg = errData.error;
        } catch {
          // fallback
        }
        setModalError(msg);
        return;
      }

      const data: EventDetailResponse = await res.json();
      setModalData(data);
    } catch {
      setModalError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeEventModal = useCallback(() => {
    setActiveEventId(null);
    setModalData(null);
    setModalError(null);
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== "ALL" && ev.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = ev.name.toLowerCase().includes(query);
        const matchVenue = ev.venue.toLowerCase().includes(query);
        if (!matchName && !matchVenue) return false;
      }
      return true;
    });
  }, [events, statusFilter, searchQuery]);

  // Filtered Orders in modal
  const filteredOrders = useMemo(() => {
    if (!modalData) return [];
    return modalData.orders.filter((order) => {
      if (orderStatusFilter !== "ALL" && order.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchEmail = order.customerEmail.toLowerCase().includes(q);
        const matchPhone = order.customerPhone.toLowerCase().includes(q);
        const matchTicket = order.tickets.some((t) =>
          t.ticketNumber.toLowerCase().includes(q)
        );
        const matchOrderId = order.id.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchTicket && !matchOrderId) {
          return false;
        }
      }
      return true;
    });
  }, [modalData, orderStatusFilter, orderSearch]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (!modalData) return;

    const BOM = "\uFEFF";
    const headers = [
      "ลำดับ",
      "รหัสคำสั่งซื้อ",
      "วันเวลาสั่งซื้อ",
      "ชื่อผู้ซื้อ",
      "อีเมล",
      "เบอร์โทรศัพท์",
      "จำนวนบัตร",
      "ยอดชำระรวม (บาท)",
      "รายได้ผู้จัด (บาท)",
      "สถานะคำสั่งซื้อ",
      "เลขที่บัตร (Ticket Numbers)",
      "สถานะบัตรแต่ละใบ",
    ];

    const escapeCSV = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredOrders.map((order, idx) => {
      const ticketNums = order.tickets.map((t) => t.ticketNumber).join(", ");
      const ticketStatuses = order.tickets
        .map((t) => `${t.ticketNumber}: ${t.status}`)
        .join(", ");
      const orderDate = new Date(order.createdAt).toLocaleString("th-TH");
      return [
        idx + 1,
        order.id,
        orderDate,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.quantity,
        order.totalAmount.toFixed(2),
        order.organizerRevenue.toFixed(2),
        order.status,
        ticketNums,
        ticketStatuses,
      ]
        .map(escapeCSV)
        .join(",");
    });

    const csvContent = BOM + [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = modalData.event.name.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `${safeName}_buyers_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [modalData, filteredOrders]);

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-w-[320px] min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors font-sans antialiased pb-20">
      <OrganizerNav />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-800 text-xs font-mono font-bold tracking-wider mb-2">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>CONCERT MANAGEMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
              จัดการคอนเสิร์ต
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              ภาพรวมยอดขาย ผู้ซื้อบัตร และสถิติการเช็คอินของคอนเสิร์ตที่คุณดูแล
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => loadEvents(true)}
              disabled={refreshing || loading}
              className="w-full sm:w-auto px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm">
            <AlertTriangleIcon className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">เกิดข้อผิดพลาด: </span>
              {errorMsg}
            </div>
            <button
              onClick={() => loadEvents()}
              className="underline text-xs hover:opacity-80"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">คอนเสิร์ตที่ดูแลทั้งหมด</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">
                {summary.totalEvents}
              </span>
              <span className="text-xs text-neutral-400">งาน</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">บัตรที่ขายได้แล้วรวม</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">
                {summary.totalSoldTickets.toLocaleString()}
              </span>
              <span className="text-xs text-neutral-400">ใบ</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">รายได้สุทธิของผู้จัด</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ฿{summary.totalOrganizerRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">คำนวณหลังหักค่าธรรมเนียมแพลตฟอร์ม</p>
          </div>

          <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 shadow-sm">
            <span className="text-xs text-neutral-500 font-medium">ยอดขายรวมทั้งหมด</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">
                ฿{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">มูลค่าบัตรที่ชำระเงินสำเร็จ</p>
          </div>
        </div>

        {/* Toolbar: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-neutral-500 shrink-0">สถานะงาน:</span>
            {(["ALL", "PUBLISHED", "DRAFT", "COMPLETED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                  statusFilter === st
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {st === "ALL"
                  ? "ทั้งหมด"
                  : st === "PUBLISHED"
                  ? "เปิดขายบัตร"
                  : st === "DRAFT"
                  ? "ฉบับร่าง"
                  : st === "COMPLETED"
                  ? "เสร็จสิ้น"
                  : "ยกเลิก"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อคอนเสิร์ต, สถานที่..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
        </div>

        {/* Concerts Grid / List */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
            <p className="text-sm text-neutral-500">กำลังโหลดรายการคอนเสิร์ต...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
            <CalendarIcon className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">ไม่พบคอนเสิร์ต</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "ไม่พบคอนเสิร์ตที่ตรงกับเงื่อนไขการค้นหา ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
                : "ยังไม่มีคอนเสิร์ตที่ได้รับมอบหมายให้คุณดูแลในระบบ"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((ev) => {
              const soldPercent =
                ev.totalTickets > 0
                  ? Math.min(100, Math.round((ev.soldTickets / ev.totalTickets) * 100))
                  : 0;
              const checkinPercent =
                ev.soldTickets > 0
                  ? Math.min(100, Math.round((ev.insideCount / ev.soldTickets) * 100))
                  : 0;

              return (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:border-neutral-400 dark:hover:border-neutral-700 transition flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    {/* Top Row: Category, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                        {ev.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          ev.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : ev.status === "COMPLETED"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : ev.status === "CANCELLED"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {ev.status === "PUBLISHED"
                          ? "เปิดขายบัตร"
                          : ev.status === "COMPLETED"
                          ? "เสร็จสิ้น"
                          : ev.status === "CANCELLED"
                          ? "ยกเลิก"
                          : "ฉบับร่าง"}
                      </span>
                    </div>

                    {/* Poster + Name & Info */}
                    <div className="flex gap-4 items-start">
                      {ev.imageUrl ? (
                        <div className="w-20 h-24 rounded-lg overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 relative">
                          <Image
                            src={ev.imageUrl}
                            alt={ev.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-24 rounded-lg shrink-0 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                          <CalendarIcon className="w-6 h-6 text-neutral-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white truncate">
                          {ev.name}
                        </h2>

                        <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                            <span className="truncate">{ev.venue}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                            <span>
                              {formatThaiDate(ev.eventDate)} ({ev.startTime} น.)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TicketIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                            <span className="font-bold text-neutral-800 dark:text-neutral-200">
                              ฿{ev.ticketPrice.toLocaleString()}
                            </span>
                            <span>/ ใบ</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bars & Metrics */}
                    <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                      {/* Ticket Sales Bar */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-neutral-500 font-medium">ยอดขายบัตร</span>
                          <span className="font-bold text-neutral-900 dark:text-white font-mono">
                            {ev.soldTickets} / {ev.totalTickets} ใบ ({soldPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-neutral-900 dark:bg-white h-2 rounded-full transition-all duration-300"
                            style={{ width: `${soldPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Check-in Bar */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-neutral-500 font-medium">การเข้างาน (Check-in)</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {ev.insideCount} เข้างานแล้ว ({checkinPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${checkinPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Revenue & Checkers stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                          <span className="text-[11px] text-neutral-400 block">รายได้สุทธิผู้จัด</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ฿{ev.organizerRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                          <span className="text-[11px] text-neutral-400 block">ผู้ตรวจบัตรประจำงาน</span>
                          <span className="text-sm font-black text-neutral-900 dark:text-white">
                            {ev.checkersCount} คน
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                    <button
                      onClick={() => openEventModal(ev.id)}
                      className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span>ดูรายละเอียด & ผู้ซื้อ ({ev.soldTickets})</span>
                    </button>

                    <Link
                      href={`/events/${ev.id}`}
                      target="_blank"
                      className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                      title="ดูหน้ารายละเอียดสาธารณะ"
                    >
                      <span>หน้าเว็บ</span>
                      <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal: Event Details & Buyer History */}
      {activeEventId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    EVENT DETAILS & BUYERS
                  </span>
                  {modalData && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        modalData.event.status === "PUBLISHED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {modalData.event.status}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white truncate">
                  {modalData ? modalData.event.name : "กำลังโหลดข้อมูลคอนเสิร์ต..."}
                </h2>
                {modalData && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>สถานที่: {modalData.event.venue}</span>
                    <span>
                      วันแสดง: {formatThaiDate(modalData.event.eventDate)} ({modalData.event.startTime} น.)
                    </span>
                    <span>ราคาบัตร: ฿{modalData.event.ticketPrice.toLocaleString()}</span>
                  </p>
                )}
              </div>

              <button
                onClick={closeEventModal}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {modalLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
                  <p className="text-sm text-neutral-500">กำลังโหลดข้อมูลผู้ซื้อและสถิติ...</p>
                </div>
              ) : modalError ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm space-y-2">
                  <p className="font-bold">{modalError}</p>
                  <button
                    onClick={() => openEventModal(activeEventId)}
                    className="underline text-xs"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              ) : modalData ? (
                <>
                  {/* Event Stats Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-500">ยอดขายบัตร</span>
                      <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-mono">
                        {modalData.stats.soldTickets} / {modalData.stats.totalTickets}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        (
                        {modalData.stats.totalTickets > 0
                          ? ((modalData.stats.soldTickets / modalData.stats.totalTickets) * 100).toFixed(1)
                          : 0}
                        % ของความจุ)
                      </span>
                    </div>

                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-500">เช็คอินแล้ว (INSIDE)</span>
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {modalData.stats.insideCount} ใบ
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        ({modalData.stats.checkinRatePercent}% ของบัตรที่ขาย)
                      </span>
                    </div>

                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-500">ยังไม่เข้างาน (OUTSIDE)</span>
                      <div className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-mono">
                        {modalData.stats.outsideCount} ใบ
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {modalData.stats.cancelledCount > 0 && `(ยกเลิก ${modalData.stats.cancelledCount} ใบ)`}
                      </span>
                    </div>

                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-500">รายได้สุทธิผู้จัด</span>
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        ฿{modalData.stats.organizerRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        ยอดขายรวม ฿{modalData.stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Buyer History Section */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                          <UsersIcon className="w-4 h-4" />
                          <span>รายชื่อผู้ซื้อบัตร & ประวัติคำสั่งซื้อ</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                            {filteredOrders.length} รายการ
                          </span>
                        </h3>
                      </div>

                      <button
                        onClick={handleExportCSV}
                        disabled={filteredOrders.length === 0}
                        className="w-full sm:w-auto px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Export CSV ({filteredOrders.length})</span>
                      </button>
                    </div>

                    {/* Search & Order Status Filters */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2.5 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-xs font-bold text-neutral-500 mr-1">สถานะ:</span>
                        {(["ALL", "PAID", "WAITING_FOR_VERIFY", "PENDING_PAYMENT", "CANCELLED"] as const).map(
                          (status) => (
                            <button
                              key={status}
                              onClick={() => setOrderStatusFilter(status)}
                              className={`px-2 py-1 rounded text-xs font-bold transition ${
                                orderStatusFilter === status
                                  ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700"
                              }`}
                            >
                              {status === "ALL"
                                ? "ทั้งหมด"
                                : status === "PAID"
                                ? "ชำระแล้ว"
                                : status === "WAITING_FOR_VERIFY"
                                ? "รอตรวจสลิป"
                                : status === "PENDING_PAYMENT"
                                ? "รอชำระ"
                                : "ยกเลิก"}
                            </button>
                          )
                        )}
                      </div>

                      <div className="relative w-full sm:w-72">
                        <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          placeholder="ค้นชื่อผู้ซื้อ, อีเมล, เบอร์, เลขบัตร..."
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
                        />
                      </div>
                    </div>

                    {/* Orders Table */}
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950 shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                              <th className="py-3 px-4">วันเวลาสั่งซื้อ</th>
                              <th className="py-3 px-4">ข้อมูลผู้ซื้อ</th>
                              <th className="py-3 px-4">จำนวน & เลขบัตร</th>
                              <th className="py-3 px-4">ยอดชำระ / สุทธิ</th>
                              <th className="py-3 px-4">สถานะคำสั่งซื้อ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                            {filteredOrders.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-neutral-400">
                                  ไม่พบข้อมูลผู้ซื้อที่ตรงกับเงื่อนไข
                                </td>
                              </tr>
                            ) : (
                              filteredOrders.map((ord) => (
                                <tr
                                  key={ord.id}
                                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                                >
                                  {/* Date & Order ID */}
                                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                    <div className="text-neutral-900 dark:text-neutral-200 font-mono">
                                      {new Date(ord.createdAt).toLocaleDateString("th-TH", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </div>
                                    <div className="text-[11px] text-neutral-400 font-mono">
                                      {new Date(ord.createdAt).toLocaleTimeString("th-TH", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}{" "}
                                      น.
                                    </div>
                                    <div className="text-[10px] text-neutral-400 font-mono mt-1">
                                      #{ord.id.slice(0, 8)}
                                    </div>
                                  </td>

                                  {/* Buyer Contact */}
                                  <td className="py-3.5 px-4 align-top">
                                    <div className="font-bold text-neutral-900 dark:text-white">
                                      {ord.customerName}
                                    </div>
                                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                      {ord.customerEmail}
                                    </div>
                                    <div className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono">
                                      {ord.customerPhone}
                                    </div>
                                  </td>

                                  {/* Tickets list */}
                                  <td className="py-3.5 px-4 align-top">
                                    <div className="font-bold text-neutral-900 dark:text-white mb-1.5">
                                      {ord.quantity} ใบ
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                                      {ord.tickets.map((t) => (
                                        <span
                                          key={t.id}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                                            t.status === "INSIDE"
                                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold"
                                              : t.status === "CANCELLED"
                                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20 line-through"
                                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                                          }`}
                                          title={`บัตร ${t.ticketNumber} (${t.status})`}
                                        >
                                          {t.status === "INSIDE" && (
                                            <CheckIcon className="w-2.5 h-2.5 shrink-0" />
                                          )}
                                          <span>{t.ticketNumber}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </td>

                                  {/* Amount */}
                                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                    <div className="font-bold text-neutral-900 dark:text-white">
                                      ฿{ord.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                                      สุทธิ ฿{ord.organizerRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </td>

                                  {/* Order Status */}
                                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${
                                        ord.status === "PAID"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                          : ord.status === "WAITING_FOR_VERIFY"
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                          : ord.status === "PENDING_PAYMENT"
                                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                      }`}
                                    >
                                      {ord.status === "PAID"
                                        ? "ชำระแล้ว"
                                        : ord.status === "WAITING_FOR_VERIFY"
                                        ? "รอตรวจสอบสลิป"
                                        : ord.status === "PENDING_PAYMENT"
                                        ? "รอชำระเงิน"
                                        : ord.status === "EXPIRED"
                                        ? "หมดอายุ"
                                        : "ยกเลิก"}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 flex justify-end">
              <button
                onClick={closeEventModal}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-bold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
