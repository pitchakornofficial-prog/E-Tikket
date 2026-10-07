"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  SearchIcon,
  ArrowRightIcon,
  MusicIcon,
} from "@/components/icons";
import { PublicNavbar } from "@/components/public-navbar";
import { formatPrice } from "@/lib/format";

interface TicketOrder {
  orderId: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  totalAmount: string;
  status: "PAID" | "WAITING_FOR_VERIFY" | "REJECTED" | "PENDING_PAYMENT" | "EXPIRED" | "CANCELLED";
  viewUrl?: string | null;
  createdAt?: string;
  event: {
    id: string;
    name: string;
    category: string;
    eventDate: string;
    startTime: string;
    venue: string;
    imageUrl: string;
  };
  tickets: Array<{
    ticketNumber: string;
    status: string;
  }>;
}

export default function MyTicketsPage() {
  const [searchMode, setSearchMode] = useState<"email" | "ticketNumber">("email");
  const [email, setEmail] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchedMode, setSearchedMode] = useState<"email" | "ticketNumber">("email");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TicketOrder[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === "email" && !email.trim()) return;
    if (searchMode === "ticketNumber" && !ticketNumber.trim()) return;

    setLoading(true);
    setError(null);

    const queryParam =
      searchMode === "email"
        ? `email=${encodeURIComponent(email.trim())}`
        : `ticketNumber=${encodeURIComponent(ticketNumber.trim())}`;

    try {
      const res = await fetch(`/api/tickets/lookup?${queryParam}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404 && searchMode === "ticketNumber") {
          setOrders([]);
          setSearched(true);
          setSearchedQuery(ticketNumber.trim());
          setSearchedMode(searchMode);
        } else {
          setError(data.error?.message || "ไม่สามารถค้นหาตั๋วได้ กรุณาลองใหม่อีกครั้ง");
          setOrders([]);
        }
      } else {
        setOrders(data.orders || []);
        setSearched(true);
        setSearchedQuery(searchMode === "email" ? email.trim() : ticketNumber.trim());
        setSearchedMode(searchMode);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // Group orders by concert/event
  const eventGroups = orders.reduce<
    Array<{
      event: TicketOrder["event"];
      orders: TicketOrder[];
    }>
  >((groups, order) => {
    let existing = groups.find((g) => g.event.id === order.event.id);
    if (!existing) {
      existing = {
        event: order.event,
        orders: [],
      };
      groups.push(existing);
    }
    existing.orders.push(order);
    return groups;
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header - Shared Public Navbar */}
      <PublicNavbar />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full space-y-10">
        <div className="space-y-2 text-center max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">ตรวจสอบสถานะบัตรคอนเสิร์ต</h1>
          <p className="text-sm text-neutral-400">
            ค้นหาด้วยอีเมลที่ใช้สั่งซื้อ หรือเลขที่บัตรของคุณ เพื่อตรวจสอบสถานะคำสั่งซื้อและบัตรเข้างาน • บัตร E-Ticket และ QR Code เข้างานจะถูกจัดส่งให้ทางอีเมลของคุณโดยตรงเพื่อความปลอดภัย
          </p>
        </div>

        {/* Search Mode Toggle & Form */}
        <div className="max-w-md mx-auto space-y-4">
          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-neutral-900 p-1 border border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setSearchMode("email");
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                searchMode === "email"
                  ? "bg-white text-black shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              ค้นหาด้วยอีเมล
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("ticketNumber");
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                searchMode === "ticketNumber"
                  ? "bg-white text-black shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              ค้นหาด้วยเลขที่บัตร
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                  <SearchIcon className="w-4 h-4" />
                </div>
                {searchMode === "email" ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="กรอกอีเมลของคุณ เช่น name@example.com"
                    required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
                  />
                ) : (
                  <input
                    type="text"
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    placeholder="กรอกเลขที่บัตร เช่น TK-abc123-01"
                    required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded pl-10 pr-4 py-2.5 text-sm text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors uppercase"
                  />
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-black text-sm font-bold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <span>{loading ? "กำลังค้นหา..." : "ค้นหาตั๋ว"}</span>
                {!loading && <ArrowRightIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
          </form>
        </div>

        {/* Results Section */}
        {searched && (
          <div className="space-y-8 pt-4">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <h2 className="text-sm sm:text-base font-bold text-neutral-200">
                ผลการค้นหาสำหรับ{searchedMode === "email" ? "อีเมล" : "เลขที่บัตร"}:{" "}
                <span className="text-white font-mono">{searchedQuery}</span>
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full border border-neutral-800 bg-neutral-950 text-neutral-400">
                พบ {orders.length} รายการ {orders.length > 0 && `(${eventGroups.length} คอนเสิร์ต)`}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 border border-dashed border-neutral-800 bg-neutral-950/40 rounded-xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                  <TicketIcon className="w-6 h-6" />
                </div>
                <p className="text-neutral-300 font-medium">
                  {searchedMode === "email"
                    ? "ไม่พบประวัติการสั่งซื้อสำหรับอีเมลนี้"
                    : "ไม่พบบัตรที่ตรงกับเลขที่นี้"}
                </p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  {searchedMode === "email"
                    ? "กรุณาตรวจสอบว่าสะกดอีเมลถูกต้อง หรือหากเพิ่งสั่งซื้อและแนบสลิป ระบบอาจใช้เวลาสักครู่ในการประมวลผล"
                    : "กรุณาตรวจสอบว่ากรอกเลขที่บัตรถูกต้องครบถ้วน หรือลองค้นหาด้วยอีเมลที่คุณใช้สั่งซื้อ"}
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {eventGroups.map((group, groupIdx) => (
                  <div key={group.event.id} className="space-y-6">
                    {/* Divider between different concerts */}
                    {groupIdx > 0 && (
                      <div className="relative pt-6 pb-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-neutral-800" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-black px-4 text-neutral-500 font-mono tracking-wider flex items-center gap-1.5">
                            <MusicIcon className="w-3.5 h-3.5" /> คอนเสิร์ตถัดไป
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Concert Header Group */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-950 border border-neutral-800/80 rounded-xl">
                      <div className="flex items-center gap-3">
                        {group.event.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.event.imageUrl}
                            alt={group.event.name}
                            className="w-12 h-12 rounded-lg object-cover border border-neutral-800 shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                              {group.event.category}
                            </span>
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-neutral-500" />
                              {group.event.eventDate}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                            {group.event.name}
                          </h3>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-400 sm:text-right font-mono">
                        {group.orders.length} คำสั่งซื้อ • รวม {group.orders.reduce((acc, o) => acc + o.quantity, 0)} ใบ
                      </div>
                    </div>

                    {/* Orders for this concert: Horizontal Long Ticket Stubs */}
                    <div className="space-y-4">
                      {group.orders.map((order) => (
                        <div
                          key={order.orderId}
                          className="relative flex flex-col md:flex-row bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-colors shadow-lg group"
                        >
                          {/* Left Section: Main Ticket Body */}
                          <div className="flex-1 p-5 md:p-6 space-y-4">
                            {/* Top Bar: Status Badge & Order Meta */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400 font-mono">
                                  Order #{order.orderId.slice(0, 8)}...
                                </span>
                              </div>

                              {/* Status Badge */}
                              {order.status === "PAID" && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-medium">
                                  <CheckCircleIcon className="w-3.5 h-3.5" />
                                  <span>ได้รับตั๋วแล้ว (พร้อมเข้างาน)</span>
                                </span>
                              )}
                              {order.status === "WAITING_FOR_VERIFY" && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600 font-medium">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  <span>รอเจ้าหน้าที่ตรวจสอบสลิป</span>
                                </span>
                              )}
                              {order.status === "PENDING_PAYMENT" && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-600 font-medium">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  <span>รอชำระเงิน</span>
                                </span>
                              )}
                              {order.status === "REJECTED" && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-red-950/80 text-red-300 border border-red-600 font-medium">
                                  <XCircleIcon className="w-3.5 h-3.5" />
                                  <span>สลิปไม่ผ่านการอนุมัติ</span>
                                </span>
                              )}
                            </div>

                            {/* Concert Details */}
                            <div>
                              <h4 className="text-lg md:text-xl font-black text-white tracking-tight">
                                {order.event.name}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-neutral-300">
                                <p className="flex items-center gap-1.5">
                                  <CalendarIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                  <span>{order.event.eventDate} • เวลา {order.event.startTime} น.</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <MapPinIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                  <span>{order.event.venue}</span>
                                </p>
                              </div>
                            </div>

                            {/* Buyer & Price Bar */}
                            <div className="pt-3 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="text-neutral-400">
                                ผู้ซื้อ: <strong className="text-white font-medium">{order.customerName}</strong> ({order.customerEmail})
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-neutral-400">
                                  จำนวน: <strong className="text-white font-mono">{order.quantity}</strong> ใบ
                                </span>
                                <span className="font-mono text-emerald-400 font-bold text-sm">
                                  ฿{formatPrice(order.totalAmount, true)}
                                </span>
                              </div>
                            </div>

                            {/* Ticket numbers if generated */}
                            {order.tickets && order.tickets.length > 0 && (
                              <div className="pt-2 border-t border-neutral-900/60">
                                <span className="text-[11px] text-neutral-500 font-mono">
                                  เลขที่บัตร: {order.tickets.map((t) => t.ticketNumber).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Perforation / Tear-off Seam */}
                          <div className="relative md:w-0 flex md:flex-col justify-between items-center bg-transparent">
                            {/* Top & Bottom notches for desktop */}
                            <div className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black border border-neutral-800 z-10" />
                            <div className="hidden md:block w-px border-r-2 border-dashed border-neutral-800 h-full my-3" />
                            <div className="hidden md:block absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black border border-neutral-800 z-10" />

                            {/* Left & Right notches for mobile */}
                            <div className="md:hidden absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black border border-neutral-800 z-10" />
                            <div className="md:hidden w-full border-b-2 border-dashed border-neutral-800" />
                            <div className="md:hidden absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black border border-neutral-800 z-10" />
                          </div>

                          {/* Right Section: Long Ticket Stub */}
                          <div className="w-full md:w-64 p-5 md:p-6 bg-neutral-900/40 flex flex-col justify-between items-center text-center gap-4 border-t md:border-t-0 md:border-l border-neutral-900">
                            <div className="space-y-1 w-full">
                              <span className="font-mono text-[10px] tracking-widest uppercase text-neutral-500 block">
                                CONCERT PASS
                              </span>
                              <p className="font-mono text-base font-black text-white">
                                {order.quantity} {order.quantity > 1 ? "TICKETS" : "TICKET"}
                              </p>
                              <span className="text-[10px] text-neutral-400 block font-mono">
                                {order.event.eventDate}
                              </span>
                            </div>

                            {/* Decorative Barcode Lines */}
                            <div className="flex items-center justify-center gap-1 opacity-60 py-1" aria-hidden="true">
                              <div className="w-0.5 h-7 bg-neutral-400" />
                              <div className="w-1.5 h-7 bg-neutral-400" />
                              <div className="w-0.5 h-7 bg-neutral-400" />
                              <div className="w-1 h-7 bg-neutral-400" />
                              <div className="w-2 h-7 bg-neutral-400" />
                              <div className="w-0.5 h-7 bg-neutral-400" />
                              <div className="w-1.5 h-7 bg-neutral-400" />
                              <div className="w-1 h-7 bg-neutral-400" />
                              <div className="w-2 h-7 bg-neutral-400" />
                              <div className="w-0.5 h-7 bg-neutral-400" />
                              <div className="w-1.5 h-7 bg-neutral-400" />
                            </div>

                            {/* Status Display Only */}
                            <div className="w-full">
                              {order.status === "PAID" ? (
                                <div className="w-full p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center space-y-1.5">
                                  <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                    อนุมัติออกตั๋วแล้ว
                                  </p>
                                  <p className="text-[11px] text-neutral-300 leading-tight">
                                    จัดส่งตั๋วและ QR Code เข้างานให้ทางอีเมลเรียบร้อยแล้ว
                                  </p>
                                  <p className="text-[10px] text-neutral-500 pt-1 border-t border-emerald-900/40">
                                    เปิดตั๋วได้จากลิงก์ในอีเมลของคุณ
                                  </p>
                                </div>
                              ) : order.status === "WAITING_FOR_VERIFY" ? (
                                <div className="w-full p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-center space-y-1.5">
                                  <p className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5 animate-pulse" />
                                    รอตรวจสอบสลิป
                                  </p>
                                  <p className="text-[11px] text-neutral-300 leading-tight">
                                    เจ้าหน้าที่กำลังตรวจสอบยอดเงิน
                                  </p>
                                  <p className="text-[10px] text-neutral-500 pt-1 border-t border-amber-900/40">
                                    ระบบจะส่งตั๋วให้อัตโนมัติเมื่ออนุมัติ
                                  </p>
                                </div>
                              ) : order.status === "REJECTED" ? (
                                <div className="w-full p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-center space-y-1.5">
                                  <p className="text-xs font-bold text-red-300 flex items-center justify-center gap-1.5">
                                    <XCircleIcon className="w-3.5 h-3.5" />
                                    ไม่ผ่านการอนุมัติ
                                  </p>
                                  <p className="text-[11px] text-neutral-300 leading-tight">
                                    สลิปไม่ตรงตามยอดหรือเวลา
                                  </p>
                                  <p className="text-[10px] text-neutral-500 pt-1 border-t border-red-900/40">
                                    บัตรถูกคืนเข้าสู่ระบบแล้ว
                                  </p>
                                </div>
                              ) : (
                                <div className="w-full p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-center space-y-1.5">
                                  <p className="text-xs font-bold text-blue-300 flex items-center justify-center gap-1.5">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    รอชำระเงิน
                                  </p>
                                  <p className="text-[11px] text-neutral-400 leading-tight">
                                    กรุณาแนบสลิปจากหน้าสั่งซื้อเดิม
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - Subtle Staff Login */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600 space-y-2">
        <p>E-Tikket Ticketing Platform • MVP</p>
        <p>
          <Link
            href="/login"
            className="text-neutral-700 hover:text-neutral-400 text-[11px] transition-colors"
          >
            เจ้าหน้าที่ / ผู้จัดงานเข้าสู่ระบบ
          </Link>
        </p>
      </footer>
    </div>
  );
}
