"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminNav } from "@/components/admin-nav";
import {
  CalendarIcon,
  MapPinIcon,
  CheckIcon,
  CheckCircleIcon,
  XIcon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  FileTextIcon,
  ArrowRightIcon,
  ClockIcon,
  UserIcon,
  SearchIcon,
} from "@/components/icons";

interface VerificationOrder {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  event: {
    id: string;
    name: string;
    category?: string;
    eventDate: string;
    startTime: string;
    venue: string;
  };
  quantity: number;
  totalAmount: string;
  status: "WAITING_FOR_VERIFY" | "PAID" | "REJECTED";
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
  slipPreview: string | null;
  createdAt: string;
  verification?: {
    paymentId: string;
    paymentStatus: string;
    verifierName: string | null;
    verifierEmail: string | null;
    verifiedAt: string | null;
    rejectReason: string | null;
    amount: string | null;
  } | null;
}

interface OrderCounts {
  waiting: number;
  paid: number;
  rejected: number;
  all: number;
}

type TabType = "WAITING_FOR_VERIFY" | "PAID" | "REJECTED" | "ALL";

export default function AdminVerificationsPage() {
  const [orders, setOrders] = useState<VerificationOrder[]>([]);
  const [counts, setCounts] = useState<OrderCounts>({ waiting: 0, paid: 0, rejected: 0, all: 0 });
  const [currentTab, setCurrentTab] = useState<TabType>("WAITING_FOR_VERIFY");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);

  // In-flight operation states
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [revertingOrderId, setRevertingOrderId] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingOrder, setRejectingOrder] = useState<VerificationOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchOrders = useCallback(async (tab: TabType = currentTab) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/verifications?filter=${tab}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorMsg("ไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ ADMIN เท่านั้น)");
        } else {
          setErrorMsg("เกิดข้อผิดพลาดในการโหลดรายการตรวจสอบยอดเงิน");
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setOrders(data.orders || []);
      if (data.counts) {
        setCounts(data.counts);
      }
      setLoading(false);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  }, [currentTab]);

  // Extract distinct event categories
  const categories = [
    "ทั้งหมด",
    ...Array.from(
      new Set(
        orders.map((o) => o.event.category || "Concert").filter(Boolean)
      )
    ),
  ];

  const filteredOrders = orders.filter((order) => {
    // 1. Filter by category
    const cat = order.event.category || "Concert";
    if (selectedCategory !== "ทั้งหมด" && cat !== selectedCategory) {
      return false;
    }

    // 2. Filter by search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      order.customer.name.toLowerCase().includes(q) ||
      order.customer.email.toLowerCase().includes(q) ||
      order.customer.phone.includes(q) ||
      order.event.name.toLowerCase().includes(q) ||
      cat.toLowerCase().includes(q) ||
      (order.verification?.rejectReason &&
        order.verification.rejectReason.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    fetchOrders(currentTab);
  }, [currentTab, fetchOrders]);

  const handleTabChange = (newTab: TabType) => {
    setCurrentTab(newTab);
    setSelectedCategory("ทั้งหมด");
    setGlobalSuccessMessage(null);
    setErrorMsg(null);
  };

  const handleApproveOrder = async (orderId: string) => {
    setApprovingOrderId(orderId);
    setErrorMsg(null);
    setGlobalSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/verifications/${orderId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "เกิดข้อผิดพลาดในการอนุมัติคำสั่งซื้อ");
        setApprovingOrderId(null);
        return;
      }

      const deliveryNote =
        data.deliveryStatus === "SENT"
          ? "และจัดส่งอีเมลสำเร็จ"
          : data.deliveryStatus === "FAILED"
            ? "แต่อีเมลส่งไม่สำเร็จ (สามารถกดส่งซ้ำได้)"
            : "(สถานะอีเมล: รอดำเนินการ)";

      setGlobalSuccessMessage(`อนุมัติคำสั่งซื้อสำเร็จ! ออกบัตร E-Ticket จำนวน ${data.ticketsCreated} ใบเรียบร้อย ${deliveryNote}`);
      setApprovingOrderId(null);
      await fetchOrders(currentTab);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setApprovingOrderId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;

    setSubmittingAction(true);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/admin/verifications/${rejectingOrder.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionFeedback(data.error?.message || "เกิดข้อผิดพลาดในการปฏิเสธคำสั่งซื้อ");
        setSubmittingAction(false);
        return;
      }

      setGlobalSuccessMessage(`ปฏิเสธคำสั่งซื้อ #${rejectingOrder.id.slice(0, 8)}... สำเร็จ บัตรได้รับการคืนเข้าสต็อกแล้ว`);
      setRejectingOrder(null);
      setSubmittingAction(false);
      await fetchOrders(currentTab);
    } catch {
      setActionFeedback("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setSubmittingAction(false);
    }
  };

  const handleRevertOrder = async (orderId: string) => {
    if (!confirm("ต้องการดึงคำสั่งซื้อนี้กลับมาสู่สถานะรอตรวจสอบ (WAITING_FOR_VERIFY) เพื่อตรวจสอบใหม่ใช่หรือไม่?")) {
      return;
    }

    setRevertingOrderId(orderId);
    setErrorMsg(null);
    setGlobalSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/verifications/${orderId}/revert`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "เกิดข้อผิดพลาดในการดึงคำสั่งซื้อกลับมาตรวจสอบ");
        setRevertingOrderId(null);
        return;
      }

      setGlobalSuccessMessage("ดึงคำสั่งซื้อกลับมาสู่สถานะรอตรวจสอบเรียบร้อยแล้ว ท่านสามารถตรวจสอบและอนุมัติออกบัตรได้ทันที");
      setRevertingOrderId(null);
      await fetchOrders(currentTab);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setRevertingOrderId(null);
    }
  };

  const handleResendEmail = async (orderId: string) => {
    setResendingOrderId(orderId);
    setErrorMsg(null);
    setGlobalSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/verifications/${orderId}/resend-email`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error?.message || "เกิดข้อผิดพลาดในการส่งอีเมลซ้ำ");
        setResendingOrderId(null);
        return;
      }

      setGlobalSuccessMessage("ส่งอีเมลบัตร E-Ticket เดิมให้ลูกค้าเรียบร้อยแล้ว");
      setResendingOrderId(null);
      await fetchOrders(currentTab);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setResendingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <AdminNav />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              ตรวจสอบการชำระเงิน (Slip Verifications)
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              ตรวจสอบสลิปการโอนเงิน อนุมัติออกตั๋ว หรือปฏิเสธพร้อมบันทึกประวัติการตรวจสอบ
            </p>
          </div>
          <button
            onClick={() => fetchOrders(currentTab)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs rounded text-neutral-300 transition-colors"
          >
            <RefreshCwIcon className="w-3.5 h-3.5" />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
          <button
            onClick={() => handleTabChange("WAITING_FOR_VERIFY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              currentTab === "WAITING_FOR_VERIFY"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>ยังไม่ผ่าน (รอตรวจสอบ)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-400 font-mono text-[10px] border border-amber-800">
              {counts.waiting}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("PAID")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              currentTab === "PAID"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>ผ่านไปแล้ว (อนุมัติแล้ว)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px] border border-emerald-800">
              {counts.paid}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("REJECTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              currentTab === "REJECTED"
                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <XCircleIcon className="w-3.5 h-3.5" />
            <span>ไม่ผ่าน (ปฏิเสธสลิป)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-red-950 text-red-400 font-mono text-[10px] border border-red-800">
              {counts.rejected}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              currentTab === "ALL"
                ? "bg-white text-black font-bold"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300 font-mono text-[10px]">
              {counts.all}
            </span>
          </button>
        </div>

        {/* Category Filter & Search Section */}
        <div className="space-y-3">
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium mr-1">หมวดหมู่คอนเสิร์ต:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    selectedCategory === cat
                      ? "bg-white text-black font-bold"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Real-time Search Bar */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา Order ID, ชื่อลูกค้า, อีเมล, เบอร์โทร, ชื่อคอนเสิร์ต หรือเหตุผลที่ปฏิเสธ..."
              className="w-full pl-10 pr-24 py-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
            />
            {searchQuery && (
              <div className="absolute right-3 flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400">
                  {filteredOrders.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="ล้างคำค้นหา"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Success Notification */}
        {globalSuccessMessage && (
          <div role="status" aria-live="polite" className="p-4 bg-emerald-950/60 border border-emerald-600 rounded-lg text-emerald-200 text-xs leading-relaxed flex justify-between items-center">
            <span className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{globalSuccessMessage}</span>
            </span>
            <button onClick={() => setGlobalSuccessMessage(null)} className="text-emerald-400 hover:text-white p-1">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-400">กำลังโหลดรายการตรวจสอบ...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <div role="alert" className="p-4 bg-red-950/50 border border-red-700 rounded-lg text-red-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => fetchOrders(currentTab)}
              className="text-xs underline text-red-300 hover:text-white"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* Empty State when no orders in category */}
        {!loading && !errorMsg && orders.length === 0 && (
          <div className="p-12 border border-dashed border-neutral-800 bg-neutral-950/40 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">ไม่มีรายการในหมวดหมู่นี้</h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {currentTab === "WAITING_FOR_VERIFY"
                ? "ไม่มีคำสั่งซื้อที่รอตรวจสอบสลิปในขณะนี้ ทุกรายการได้รับการประมวลผลแล้ว"
                : "ไม่พบคำสั่งซื้อในสถานะที่เลือก"}
            </p>
          </div>
        )}

        {/* Empty State when search returns 0 results */}
        {!loading && !errorMsg && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="p-12 border border-dashed border-neutral-800 bg-neutral-950/40 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
              <SearchIcon className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">ไม่พบผลการค้นหา</h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              ไม่พบคำสั่งซื้อที่ตรงกับ &ldquo;{searchQuery}&rdquo; ในหมวดหมู่นี้
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-xs rounded-lg text-white hover:bg-neutral-800 transition-colors"
            >
              ล้างคำค้นหา
            </button>
          </div>
        )}

        {/* Order Cards List */}
        {!loading && !errorMsg && filteredOrders.length > 0 && (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden divide-y divide-neutral-900 shadow-xl"
              >
                {/* Header bar */}
                <div className="p-4 bg-neutral-900/60 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-neutral-300">
                      Order #{order.id.slice(0, 8)}...
                    </span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold flex items-center gap-1.5 ${
                        order.status === "WAITING_FOR_VERIFY"
                          ? "bg-amber-950 text-amber-300 border border-amber-700"
                          : order.status === "PAID"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                            : "bg-red-950 text-red-300 border border-red-700"
                      }`}
                    >
                      {order.status === "WAITING_FOR_VERIFY" && (
                        <>
                          <ClockIcon className="w-3 h-3" />
                          <span>รอตรวจสอบสลิป</span>
                        </>
                      )}
                      {order.status === "PAID" && (
                        <>
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>อนุมัติแล้ว (PAID)</span>
                        </>
                      )}
                      {order.status === "REJECTED" && (
                        <>
                          <XCircleIcon className="w-3 h-3" />
                          <span>ปฏิเสธ (REJECTED)</span>
                        </>
                      )}
                    </span>

                    {order.status === "PAID" && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        order.deliveryStatus === "SENT"
                          ? "bg-neutral-900 text-neutral-400 border border-neutral-800"
                          : order.deliveryStatus === "FAILED"
                            ? "bg-red-950/80 text-red-300 border border-red-800"
                            : "bg-blue-950/80 text-blue-300 border border-blue-800"
                      }`}>
                        EMAIL: {order.deliveryStatus}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-neutral-400 font-mono">
                    จำนวน: <strong className="text-white">{order.quantity}</strong> ใบ • ยอดเงิน: <strong className="text-emerald-400 font-mono">฿{order.totalAmount}</strong>
                  </span>
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  {/* Left Column: Details & Audit Trail */}
                  <div className="space-y-4">
                    <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      ข้อมูลคำสั่งซื้อและผู้ซื้อ
                    </h2>

                    <div className="p-4 bg-neutral-900/60 border border-neutral-800/80 rounded-lg space-y-3 text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500 block">งานแสดง:</span>
                          {order.event.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {order.event.category}
                            </span>
                          )}
                        </div>
                        <strong className="text-white text-sm block mt-0.5">{order.event.name}</strong>
                        <div className="flex flex-wrap items-center gap-3 text-neutral-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{order.event.venue}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{order.event.eventDate.split("T")[0]} ({order.event.startTime} น.)</span>
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-neutral-800 pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-neutral-500 block">ชื่อผู้สั่งซื้อ:</span>
                          <span className="text-neutral-200 font-medium">{order.customer.name}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">เบอร์โทรศัพท์:</span>
                          <span className="text-neutral-200 font-medium">{order.customer.phone}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-neutral-500 block">อีเมล:</span>
                          <span className="text-neutral-200 font-medium font-mono">{order.customer.email}</span>
                        </div>
                      </div>

                      <div className="border-t border-neutral-800 pt-2 flex justify-between items-baseline">
                        <span className="text-neutral-400 font-semibold">ยอดที่ต้องได้รับ (ตรงเป๊ะ):</span>
                        <strong className="text-emerald-400 text-base font-mono">฿{order.totalAmount}</strong>
                      </div>
                    </div>

                    {/* Audit Trail Log (เก็บข้อมูลการอนุมัติ / ไม่อนุมัติ) */}
                    {order.verification && (order.verification.verifiedAt || order.verification.verifierName) && (
                      <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-400 font-semibold">
                          <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                          <span>บันทึกประวัติการตรวจสอบ (Audit Log)</span>
                        </div>
                        <div className="text-[11px] text-neutral-300 space-y-1 pl-5">
                          {order.verification.verifierName && (
                            <p>
                              ผู้ดำเนินการ: <strong className="text-white">{order.verification.verifierName}</strong> ({order.verification.verifierEmail})
                            </p>
                          )}
                          {order.verification.verifiedAt && (
                            <p className="text-neutral-400 font-mono">
                              เวลาที่ดำเนินการ: {new Date(order.verification.verifiedAt).toLocaleString("th-TH")}
                            </p>
                          )}
                          {order.verification.rejectReason && (
                            <div className="p-2 bg-red-950/40 border border-red-900/60 rounded text-red-300 mt-1">
                              <strong>เหตุผล / หมายเหตุ:</strong> {order.verification.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Slip Image Preview */}
                  <div className="space-y-4">
                    <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      หลักฐานสลิปการโอนเงิน
                    </h2>

                    <div className="flex flex-col items-center justify-center p-4 bg-neutral-900/60 border border-neutral-800/80 rounded-lg min-h-[260px] text-center">
                      {order.slipPreview ? (
                        <div className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={order.slipPreview}
                            alt={`สลิปคำสั่งซื้อ ${order.id}`}
                            className="max-h-72 object-contain rounded border border-neutral-700 mx-auto shadow-md"
                          />
                          <span className="text-[11px] text-neutral-400 block font-mono">
                            สลิปจาก R2 • วันที่สั่งซื้อ {new Date(order.createdAt).toLocaleDateString("th-TH")}
                          </span>
                        </div>
                      ) : (
                        <div className="text-neutral-500 space-y-2">
                          <FileTextIcon className="w-10 h-10 text-neutral-600 mx-auto" />
                          <p className="text-xs">ไม่พบไฟล์ภาพสลิป หรือไม่มีการแนบสลิป</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="p-4 bg-neutral-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <p className="text-[11px] text-neutral-500">
                    {order.status === "PAID"
                      ? "อนุมัติแล้ว • บัตรออกเรียบร้อย (สามารถกดส่งอีเมลซ้ำได้หากลูกค้าไม่ได้รับ)"
                      : order.status === "REJECTED"
                        ? "ถูกปฏิเสธ • บัตรถูกคืนเข้าสู่สต็อกแล้ว (สามารถกดดึงกลับมาตรวจสอบใหม่ได้)"
                        : "รอการตรวจสอบ • ยังไม่ออกตั๋วและบัตรยังถูกล็อกไว้"}
                  </p>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {order.status === "PAID" && (
                      <button
                        onClick={() => handleResendEmail(order.id)}
                        disabled={resendingOrderId === order.id}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {resendingOrderId === order.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>กำลังส่งอีเมล...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                            <span>ส่งอีเมลบัตรเดิมอีกครั้ง</span>
                          </>
                        )}
                      </button>
                    )}

                    {order.status === "REJECTED" && (
                      <button
                        onClick={() => handleRevertOrder(order.id)}
                        disabled={revertingOrderId === order.id}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-amber-300 font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {revertingOrderId === order.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                            <span>กำลังดึงกลับ...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCwIcon className="w-3.5 h-3.5" />
                            <span>↺ ดึงกลับมาตรวจสอบใหม่ (Revert)</span>
                          </>
                        )}
                      </button>
                    )}

                    {order.status === "WAITING_FOR_VERIFY" && (
                      <>
                        {/* Approve button */}
                        <button
                          onClick={() => handleApproveOrder(order.id)}
                          disabled={approvingOrderId === order.id}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-white text-black hover:bg-neutral-200 font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {approvingOrderId === order.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              <span>กำลังออกตั๋ว...</span>
                            </>
                          ) : (
                            <>
                              <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Approve / อนุมัติออกตั๋ว</span>
                            </>
                          )}
                        </button>

                        {/* Reject button */}
                        <button
                          onClick={() => {
                            setRejectingOrder(order);
                            setRejectReason("");
                            setActionFeedback(null);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 font-bold rounded text-xs transition-colors"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          <span>Reject / ปฏิเสธ</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal with Quick Presets (รองรับกรณีโอนไม่ครบ / สลิปผิด) */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">ปฏิเสธคำสั่งซื้อ #{rejectingOrder.id.slice(0, 8)}...</h2>
              <p className="text-xs text-neutral-400">
                ลูกค้า: <strong className="text-white">{rejectingOrder.customer.name}</strong> • ยอดคำสั่งซื้อ: <strong className="text-emerald-400 font-mono">฿{rejectingOrder.totalAmount}</strong>
              </p>
            </div>

            {actionFeedback && (
              <div role="alert" className="p-2.5 bg-red-950 border border-red-700 text-red-200 text-xs rounded flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
            )}

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 block font-medium">
                เลือกเหตุผลสำเร็จรูป (คลิกเพื่อใส่ข้อความ):
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRejectReason(`ยอดเงินโอนไม่ครบตามจำนวนคำสั่งซื้อ (ยอดที่ต้องชำระคือ ฿${rejectingOrder.totalAmount}) กรุณาติดต่อเจ้าหน้าที่หรือทำรายการใหม่`)}
                  className="text-left p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-[11px] text-neutral-300 transition-colors"
                >
                  ⚠️ <strong>โอนเงินไม่ครบถ้วน</strong> (ยอดโอนไม่ถึง ฿{rejectingOrder.totalAmount})
                </button>
                <button
                  type="button"
                  onClick={() => setRejectReason("ไม่พบยอดเงินเข้าบัญชี หรือบัญชีปลายทางไม่ถูกต้อง กรุณาตรวจสอบสลิปของท่าน")}
                  className="text-left p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-[11px] text-neutral-300 transition-colors"
                >
                  ⚠️ <strong>สลิปไม่ถูกต้อง / บัญชีไม่ตรง</strong>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectReason("วันเวลาในสลิปไม่สอดคล้องกับช่วงเวลาที่ทำการสั่งซื้อบัตร")}
                  className="text-left p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-[11px] text-neutral-300 transition-colors"
                >
                  ⚠️ <strong>วันเวลาในสลิปไม่ถูกต้อง</strong>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectReason("สลิปหลักฐานการโอนเงินนี้เคยถูกใช้งานในระบบแล้ว (สลิปซ้ำ)")}
                  className="text-left p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-[11px] text-neutral-300 transition-colors"
                >
                  ⚠️ <strong>สลิปซ้ำในระบบ</strong>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reject-reason-input" className="block text-xs text-neutral-300">
                รายละเอียดเหตุผลที่จะแจ้งลูกค้าในอีเมล:
              </label>
              <textarea
                id="reject-reason-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น โอนเงินขาด 200 บาท หรือ สลิปไม่ชัดเจน..."
                className="w-full p-2.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              * เมื่อยืนยัน ระบบจะปรับสถานะเป็น <strong className="text-neutral-300">REJECTED</strong>, คืนจำนวนบัตร {rejectingOrder.quantity} ใบเข้าสู่สต็อก และส่งอีเมลแจ้งลูกค้า (สามารถดึงกลับมาตรวจสอบใหม่ได้ในภายหลัง)
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                disabled={submittingAction}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded text-xs hover:bg-neutral-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={submittingAction}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xs transition-colors"
              >
                {submittingAction ? "กำลังดำเนินการ..." : "ยืนยันการปฏิเสธ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-600">
        <p>E-Tikket Admin Dashboard • MVP</p>
      </footer>
    </div>
  );
}
