"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { OrganizerNav } from "@/components/organizer-nav";
import {
  SearchIcon,
  DownloadIcon,
  RefreshCwIcon,
  XIcon,
} from "@/components/icons";

interface EventItem {
  id: string;
  name: string;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
}

interface OrderItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  ticketTier: string;
  totalAmount: number;
  organizerRevenue: number;
  status: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
  };
  tickets: TicketItem[];
}

interface OrdersResponse {
  events: EventItem[];
  orders: OrderItem[];
  stats: {
    totalTicketsSold: number;
    totalCapacity: number;
    paidOrdersCount: number;
    totalRevenue: number;
    generalRevenue: number;
    studentRevenue: number;
    generalCount: number;
    studentCount: number;
  };
}

export default function OrganizerOrdersPage() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTierFilter, setActiveTierFilter] = useState<"ALL" | "GENERAL" | "STUDENT">("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [selectedTierSelect, setSelectedTierSelect] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY">("ALL");

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // CSV export state
  const [exporting, setExporting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/organizer/orders");
      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
        } else if (res.status === 403) {
          setErrorMsg("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้จัดงาน");
        } else {
          setErrorMsg("เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ");
        }
        setLoading(false);
        return;
      }
      const json: OrdersResponse = await res.json();
      setData(json);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Sync tier pill and select
  const handleTierPillClick = (tier: "ALL" | "GENERAL" | "STUDENT") => {
    setActiveTierFilter(tier);
    setSelectedTierSelect(tier);
  };

  const handleTierSelectChange = (tier: string) => {
    setSelectedTierSelect(tier);
    if (tier === "ALL" || tier === "GENERAL" || tier === "STUDENT") {
      setActiveTierFilter(tier);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setActiveTierFilter("ALL");
    setSelectedEventId("ALL");
    setSelectedTierSelect("ALL");
    setDatePreset("ALL");
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.filter((ord) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ord.customerName.toLowerCase().includes(q);
        const matchesEmail = ord.customerEmail.toLowerCase().includes(q);
        const matchesPhone = ord.customerPhone.toLowerCase().includes(q);
        const matchesId = ord.id.toLowerCase().includes(q);
        const matchesTickets = ord.tickets.some((t) =>
          t.ticketNumber.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId && !matchesTickets) {
          return false;
        }
      }

      // 2. Tier Filter
      const tierMatch = activeTierFilter === "ALL" || ord.ticketTier === activeTierFilter;
      if (!tierMatch) return false;

      // 3. Event Filter
      if (selectedEventId !== "ALL" && ord.event.id !== selectedEventId) {
        return false;
      }

      // 4. Date Preset (TODAY)
      if (datePreset === "TODAY") {
        const ordDate = new Date(ord.createdAt);
        const now = new Date();
        const isToday =
          ordDate.getDate() === now.getDate() &&
          ordDate.getMonth() === now.getMonth() &&
          ordDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      }

      return true;
    });
  }, [data, searchQuery, activeTierFilter, selectedEventId, datePreset]);

  // Export CSV
  const handleExportCSV = async () => {
    if (!data || data.orders.length === 0) return;
    setExporting(true);
    try {
      // If a single event is selected, use the event export route with attendees mode (which is stripped of door status)
      const targetEventId = selectedEventId !== "ALL" ? selectedEventId : data.events[0]?.id;
      if (targetEventId) {
        const res = await fetch(`/api/events/${targetEventId}/export?type=attendees`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `buyer_attendees_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          setExporting(false);
          return;
        }
      }

      // Fallback client-side CSV generator if multi-event
      const headers = [
        "Order ID",
        "วันที่สั่งซื้อ",
        "ชื่อผู้ซื้อ",
        "อีเมล",
        "เบอร์โทร",
        "คอนเสิร์ต",
        "ประเภทบัตร",
        "รหัสตั๋ว",
        "จำนวนบัตร",
        "ยอดชำระ",
        "สถานะคำสั่งซื้อ",
      ];
      const rows = filteredOrders.map((ord) => [
        `"${ord.id}"`,
        `"${new Date(ord.createdAt).toLocaleString("th-TH")}"`,
        `"${ord.customerName.replace(/"/g, '""')}"`,
        `"${ord.customerEmail}"`,
        `"${ord.customerPhone}"`,
        `"${ord.event.name.replace(/"/g, '""')}"`,
        `"${ord.ticketTier === "STUDENT" ? "ส่วนลดนักศึกษา @ubu" : "บัตรทั่วไป"}"`,
        `"${ord.tickets.map((t) => t.ticketNumber).join(", ")}"`,
        ord.quantity,
        ord.totalAmount.toFixed(2),
        `"${ord.status}"`,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buyer_orders_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors">
      <OrganizerNav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
              <span>รายชื่อผู้ซื้อบัตร (Ticket Buyers & Orders)</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              ตรวจสอบข้อมูลคำสั่งซื้อ รายชื่อผู้ซื้อบัตร (ชื่อ เบอร์ อีเมล) และส่งออกรายชื่อสำหรับจัดทำบัญชี (ระบบปิดซ่อน QR Code ทางเข้างานเพื่อความปลอดภัย)
            </p>
          </div>
          <div>
            <button
              onClick={handleExportCSV}
              disabled={exporting || !data || data.orders.length === 0}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {exporting ? (
                <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DownloadIcon className="w-3.5 h-3.5" />
              )}
              <span>ดาวน์โหลด CSV (Export Buyers List)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Quick Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Total Tickets Sold */}
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">ยอดจำหน่ายบัตรทั้งหมด (Total Tickets Sold)</span>
            <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
              {data ? data.stats.totalTicketsSold : 0}{" "}
              <span className="text-sm font-normal text-neutral-400">
                / {data ? data.stats.totalCapacity : 0} ใบ
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {data && data.stats.totalCapacity > 0
                ? `จำหน่ายแล้ว ${((data.stats.totalTicketsSold / data.stats.totalCapacity) * 100).toFixed(1)}% • คงเหลือ ${data.stats.totalCapacity - data.stats.totalTicketsSold} ใบ`
                : "ไม่มีโควตาเปิดขาย"}
            </p>
          </div>

          {/* Card 2: Paid Orders */}
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">คำสั่งซื้อที่ชำระสำเร็จ (Paid Orders)</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {data ? data.stats.paidOrdersCount : 0}{" "}
              <span className="text-sm font-normal text-neutral-400">ออเดอร์</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              ชำระสำเร็จ 100% ผ่าน PromptPay อัตโนมัติ
            </p>
          </div>

          {/* Card 3: Total Revenue */}
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500">รายรับรวมจากผู้ซื้อ (Total Ticket Revenue)</span>
            <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
              ฿{data ? data.stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}{" "}
              <span className="text-sm font-normal text-neutral-400">บาท</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              บัตรทั่วไป ฿{data ? data.stats.generalRevenue.toLocaleString() : "0"} • บัตรนักศึกษา ฿{data ? data.stats.studentRevenue.toLocaleString() : "0"}
            </p>
          </div>
        </div>

        {/* Filter and Search Container */}
        <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 mb-6">
          {/* Row 1: Search & Tier Pills & Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วย Order ID, ชื่อผู้ซื้อ, เบอร์โทร, อีเมล หรือรหัสตั๋ว..."
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => handleTierPillClick("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTierFilter === "ALL"
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                }`}
              >
                ทั้งหมด ({data ? data.orders.length : 0})
              </button>
              <button
                type="button"
                onClick={() => handleTierPillClick("GENERAL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTierFilter === "GENERAL"
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                }`}
              >
                บัตรทั่วไป ({data ? data.stats.generalCount : 0})
              </button>
              <button
                type="button"
                onClick={() => handleTierPillClick("STUDENT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTierFilter === "STUDENT"
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                }`}
              >
                ส่วนลดนักศึกษา @ubu ({data ? data.stats.studentCount : 0})
              </button>
            </div>
          </div>

          {/* Row 2: Secondary Dropdowns and Reset */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-900 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">คอนเสิร์ต:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white"
              >
                <option value="ALL">ทุกคอนเสิร์ต</option>
                {data?.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">ประเภทตั๋ว:</span>
              <select
                value={selectedTierSelect}
                onChange={(e) => handleTierSelectChange(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white"
              >
                <option value="ALL">ทุกประเภทตั๋ว</option>
                <option value="GENERAL">บัตรทั่วไป (General Admission)</option>
                <option value="STUDENT">บัตรส่วนลดนักศึกษา (@ubu)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">ช่วงวันที่:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDatePreset("ALL")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    datePreset === "ALL"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                      : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset("TODAY")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    datePreset === "TODAY"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                      : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  วันนี้
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline text-xs ml-auto"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Results Count Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 text-xs text-neutral-500">
          <div>
            แสดง <strong className="text-neutral-900 dark:text-white font-mono">{filteredOrders.length}</strong> จากทั้งหมด {data ? data.orders.length : 0} รายการคำสั่งซื้อ
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span>🔒 ระบบปิดซ่อน QR Code ทางเข้างานเพื่อความปลอดภัยของผู้ซื้อ • แสดงเฉพาะข้อมูลผู้ซื้อเท่านั้น</span>
          </div>
        </div>

        {/* Orders Table */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order ID / วันที่</th>
                  <th className="py-3 px-4">ข้อมูลผู้ซื้อ (Buyer Details)</th>
                  <th className="py-3 px-4">คอนเสิร์ต & ประเภทบัตร</th>
                  <th className="py-3 px-4">รหัสตั๋ว (Ticket Ref)</th>
                  <th className="py-3 px-4">จำนวน & ยอดเงิน</th>
                  <th className="py-3 px-4">สถานะชำระเงิน</th>
                  <th className="py-3 px-4 text-right">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <RefreshCwIcon className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                      กำลังโหลดข้อมูลคำสั่งซื้อ...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      ไม่พบข้อมูลผู้ซื้อที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      {/* Order ID & Date */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono font-bold text-neutral-900 dark:text-neutral-200">
                          #{ord.id.slice(0, 10)}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          ,{" "}
                          {new Date(ord.createdAt).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          น.
                        </div>
                      </td>

                      {/* Buyer Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {ord.customerName}
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                          ✉ {ord.customerEmail}
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-[11px] font-mono">
                          📞 {ord.customerPhone}
                        </div>
                      </td>

                      {/* Event & Tier */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-neutral-900 dark:text-white text-xs">
                          {ord.event.name}
                        </div>
                        <div className="mt-1">
                          {ord.ticketTier === "STUDENT" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              ส่วนลดนักศึกษา @ubu
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                              บัตรทั่วไป (General)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ticket Refs */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {ord.tickets.map((t) => (
                            <span
                              key={t.id}
                              className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700"
                            >
                              {t.ticketNumber}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Qty & Total */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {ord.quantity} ใบ
                        </div>
                        <div className="text-neutral-500 text-[11px] font-mono">
                          ฿{ord.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
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
                            ? "ชำระสำเร็จ"
                            : ord.status === "WAITING_FOR_VERIFY"
                            ? "รอตรวจสลิป"
                            : ord.status === "PENDING_PAYMENT"
                            ? "รอชำระเงิน"
                            : ord.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold transition"
                        >
                          ดูข้อมูลผู้ซื้อ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buyer & Order Details Modal with Security-Masked QR Container */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  รายละเอียดข้อมูลผู้ซื้อ
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Security-Masked QR Code Box */}
                <div className="relative rounded-xl overflow-hidden bg-neutral-950 p-6 text-center border-2 border-dashed border-neutral-800">
                  {/* Blurred Background visual */}
                  <div className="filter blur-md opacity-20 flex justify-center pointer-events-none select-none">
                    <div className="w-28 h-28 bg-white grid grid-cols-4 gap-1 p-2">
                      <div className="bg-black"></div>
                      <div className="bg-black"></div>
                      <div className="bg-black"></div>
                      <div className="bg-black"></div>
                    </div>
                  </div>

                  {/* Shield Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-neutral-950/90">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-2">
                      <svg
                        className="w-5 h-5 text-emerald-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <strong className="text-white text-xs font-bold">
                      🔒 QR Code ถูกปิดซ่อนไว้ (Security Masked)
                    </strong>
                    <p className="text-[11px] text-neutral-400 mt-1 max-w-xs text-center leading-relaxed">
                      ระบบปิดซ่อนภาพ QR Code ทางเข้างานในหน้านี้ เพื่อความปลอดภัยสูงสุดของผู้ซื้อบัตร และป้องกันการรั่วไหลก่อนถึงหน้างาน
                    </p>
                    <div className="mt-2.5 font-mono text-emerald-400 font-bold text-xs bg-black/60 px-3 py-1 rounded border border-emerald-500/30">
                      {selectedOrder.tickets.map((t) => t.ticketNumber).join(", ")}
                    </div>
                  </div>
                </div>

                {/* Buyer Details Breakdown */}
                <div className="bg-neutral-50 dark:bg-neutral-950/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2.5 divide-y divide-neutral-200 dark:divide-neutral-800">
                  <div className="flex justify-between items-center pt-2 first:pt-0">
                    <span className="text-neutral-500">หมายเลขคำสั่งซื้อ:</span>
                    <strong className="font-mono text-neutral-900 dark:text-white">
                      #{selectedOrder.id}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">ชื่อผู้ซื้อ (Buyer Name):</span>
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedOrder.customerName}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">อีเมลผู้รับตั๋ว:</span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {selectedOrder.customerEmail}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">เบอร์โทรศัพท์ติดต่อ:</span>
                    <span className="font-mono text-neutral-900 dark:text-white">
                      {selectedOrder.customerPhone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">งานคอนเสิร์ต:</span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {selectedOrder.event.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">ประเภทบัตร:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedOrder.ticketTier === "STUDENT"
                        ? "ส่วนลดนักศึกษา (@ubu.ac.th)"
                        : "บัตรทั่วไป (General Admission)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">จำนวนบัตร:</span>
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedOrder.quantity} ใบ
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">ยอดเงินที่ชำระ (Total Paid):</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      ฿{selectedOrder.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">สถานะการชำระ:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {selectedOrder.status === "PAID" ? "ชำระเงินเรียบร้อย 100%" : selectedOrder.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500">วัน-เวลาที่สั่งซื้อ:</span>
                    <span className="text-neutral-400 text-[11px] font-mono">
                      {new Date(selectedOrder.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      ,{" "}
                      {new Date(selectedOrder.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      น.
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
