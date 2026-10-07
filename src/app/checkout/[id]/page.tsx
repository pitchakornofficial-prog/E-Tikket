"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ServerCrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FileTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

interface OrderData {
  orderId: string;
  event: {
    id: string;
    name: string;
    imageUrl: string;
    eventDate: string;
    startTime: string;
    venue: string;
    ticketPrice: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  quantity: number;
  totalAmount: string;
  orderStatus: "PENDING_PAYMENT" | "WAITING_FOR_VERIFY" | "PAID" | "EXPIRED" | "REJECTED" | "CANCELLED";
  expiresAt: string;
  bankAccount: {
    bank: string;
    accountName: string;
    accountNumber: string;
  };
  transferQr?: string;
}

function CheckoutContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const token = searchParams.get("token");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Slip upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("ขนาดไฟล์สลิปเกิน 5 MB กรุณาเลือกไฟล์ใหม่");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadError("รองรับเฉพาะไฟล์รูปภาพ JPEG หรือ PNG เท่านั้น");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSlipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !id || !token) {
      setUploadError("กรุณาเลือกไฟล์สลิปก่อนส่ง");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`/api/orders/${id}/slip?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error?.message || "เกิดข้อผิดพลาดในการส่งสลิป");
        setUploading(false);
        if (data.orderStatus === "EXPIRED") {
          // Immediately update order status to EXPIRED
          setOrder((prev) => (prev ? { ...prev, orderStatus: "EXPIRED" } : prev));
        }
        return;
      }

      // Success: update order status to WAITING_FOR_VERIFY
      setOrder((prev) => (prev ? { ...prev, orderStatus: "WAITING_FOR_VERIFY" } : prev));
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploading(false);
    } catch {
      setUploadError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setUploading(false);
    }
  };

  const fetchOrder = async () => {
    if (!id || !token) {
      setErrorStatus(404);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${id}?token=${encodeURIComponent(token)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setErrorStatus(res.status);
        setLoading(false);
        return;
      }

      const data: OrderData = await res.json();
      setOrder(data);
      setLoading(false);

      if (data.expiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setTimeRemaining(remaining);
      }
    } catch {
      setErrorStatus(503);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  // Timer countdown interval
  useEffect(() => {
    if (!order || order.orderStatus !== "PENDING_PAYMENT" || timeRemaining === null) return;

    if (timeRemaining <= 0) {
      // Refresh order to reflect server-side idempotent expiration
      fetchOrder();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          startTransition(() => {
            fetchOrder();
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderStatus, timeRemaining]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col transition-colors duration-200 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400">กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
        </div>
      </div>
    );
  }

  if (errorStatus === 404 || !order) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col transition-colors duration-200 items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 border border-neutral-800 bg-neutral-950 rounded-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">ไม่พบคำสั่งซื้อ หรือไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-sm text-neutral-400">
            ลิงก์คำสั่งซื้อไม่ถูกต้อง หรือสิทธิ์การเข้าถึง (Checkout Token) ไม่ถูกต้อง กรุณาตรวจสอบลิงก์ของท่าน
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded hover:bg-neutral-700 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" /> กลับสู่หน้ารวมงานแสดง
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus === 503) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col transition-colors duration-200 items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 border border-neutral-800 bg-neutral-950 rounded-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ServerCrashIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-red-400">ระบบไม่สามารถให้บริการได้ในขณะนี้</h1>
          <p className="text-sm text-neutral-400">
            เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณารีเฟรชเพื่อลองใหม่อีกครั้ง
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setErrorStatus(null);
              fetchOrder();
            }}
            className="px-5 py-2.5 bg-neutral-800 text-white text-sm font-medium rounded hover:bg-neutral-700 transition-colors"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const isExpired = order.orderStatus === "EXPIRED" || (order.orderStatus === "PENDING_PAYMENT" && (timeRemaining ?? 0) <= 0);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-900 bg-white/90 dark:bg-neutral-950/90 backdrop-blur sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold tracking-wider text-lg uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-mono">MVP</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 hidden sm:inline">Guest Checkout</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full space-y-6">
        <p className="text-xs text-neutral-500">
          หน้าชำระเงินจาก checkout link • แยกจากลิงก์เปิดบัตรทางอีเมล
        </p>

        {/* 15-Minute Reservation Timer Banner */}
        {order.orderStatus === "PENDING_PAYMENT" && !isExpired && (
          <div
            id="timer-banner"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-600/50 rounded-lg text-amber-900 dark:text-amber-200"
          >
            <div>
              <strong className="text-sm font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                เวลาในการล็อกบัตรและชำระเงิน
              </strong>
              <span className="text-xs text-amber-800 dark:text-amber-200/80">
                กรุณาโอนเงินและแนบสลิปก่อนหมดเวลา เพื่อรักษาสิทธิ์บัตรของท่าน
              </span>
            </div>
            <div
              id="reservation-timer"
              className="font-mono text-2xl font-black text-amber-900 dark:text-amber-300 tracking-wider"
              aria-live="polite"
            >
              {timeRemaining !== null ? formatTimer(timeRemaining) : "--:--"}
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div
            id="order-expired-msg"
            role="alert"
            className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-600 rounded-lg text-red-900 dark:text-red-300 text-sm space-y-2"
          >
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              คำสั่งซื้อนี้หมดเวลา 15 นาทีแล้ว
            </p>
            <p className="text-xs text-red-700 dark:text-red-300/80">
              ระบบได้ทำการคืนสต็อกบัตรเรียบร้อย กรุณากดทำรายการสั่งซื้อใหม่อีกครั้ง
            </p>
            <Link
              href={`/events/${order.event.id}`}
              className="inline-flex items-center gap-1 mt-2 px-4 py-2 bg-red-600 dark:bg-red-900/60 hover:bg-red-700 dark:hover:bg-red-800 text-white text-xs font-semibold rounded transition-colors"
            >
              ทำรายการสั่งซื้อใหม่ <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Waiting For Verification Notice */}
        {order.orderStatus === "WAITING_FOR_VERIFY" && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-600 rounded-lg text-blue-900 dark:text-blue-200 text-sm space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              แนบสลิปเรียบร้อยแล้ว — กำลังรอเจ้าหน้าที่ตรวจสอบยอดเงิน
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300/80">
              เจ้าหน้าที่จะตรวจสอบหลักฐานการโอนเงินและออกตั๋ว E-Ticket ส่งไปยังอีเมล {order.customer.email} ของคุณ
            </p>
          </div>
        )}

        {/* Paid Notice */}
        {order.orderStatus === "PAID" && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600 rounded-lg text-emerald-900 dark:text-emerald-200 text-sm space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ชำระเงินเรียบร้อยแล้ว (PAID)
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
              ระบบได้จัดส่ง E-Ticket และ QR Code เข้างานไปยังอีเมล {order.customer.email} เรียบร้อยแล้ว
            </p>
          </div>
        )}

        {/* Rejected Notice */}
        {order.orderStatus === "REJECTED" && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-600 rounded-lg text-red-900 dark:text-red-200 text-sm space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <XCircleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              การชำระเงินไม่ผ่านการอนุมัติ (REJECTED)
            </p>
            <p className="text-xs text-red-700 dark:text-red-300/80">
              สลิปหลักฐานการโอนเงินไม่ถูกต้อง หรือยอดเงินไม่ตรงตามที่กำหนด บัตรได้รับการคืนเข้าสู่สต็อกแล้ว
            </p>
          </div>
        )}

        {/* Order Heading & Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-900">
          <div>
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-mono">คำสั่งซื้อเลขที่</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white mt-1">
              Order #{order.orderId.slice(0, 8)}...
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              ผู้สั่งซื้อ: <strong className="text-neutral-900 dark:text-white">{order.customer.name}</strong> ({order.customer.email}, {order.customer.phone})
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-neutral-500 block mb-1">สถานะคำสั่งซื้อ:</span>
            <span
              id="order-status-badge"
              className={`inline-block px-3 py-1 rounded text-xs font-bold font-mono ${
                order.orderStatus === "PENDING_PAYMENT"
                  ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:border-amber-600 dark:text-amber-300"
                  : order.orderStatus === "WAITING_FOR_VERIFY"
                  ? "bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-300"
                  : order.orderStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:border-emerald-600 dark:text-emerald-300"
                  : "bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:border-red-600 dark:text-red-300"
              }`}
            >
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Order Summary Details */}
        <div className="p-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4 shadow-sm dark:shadow-none">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-wide">
            รายการบัตร
          </h2>
          <div className="flex justify-between items-center text-sm text-neutral-700 dark:text-neutral-300">
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white">{order.event.name}</p>
              <p className="text-xs text-neutral-500">
                {order.event.venue} • บัตรทั่วไป (&times; {order.quantity} ใบ)
              </p>
            </div>
            <div className="font-mono font-semibold">
              ฿{order.totalAmount}
            </div>
          </div>
          <div className="flex justify-between items-baseline pt-4 border-t border-neutral-200 dark:border-neutral-900">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">ยอดเงินที่ต้องชำระ:</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white font-mono">฿{order.totalAmount}</span>
          </div>
        </div>

        {/* Payment Transfer Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm dark:shadow-none">
          {/* Transfer QR */}
          <div className="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-900 text-center space-y-3">
            <div className="bg-white p-3 rounded-lg border-2 border-neutral-200 dark:border-black inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.transferQr || "/qr-transfer-sample.svg"}
                alt="QR Code สำหรับโอนเงิน"
                className="w-36 h-36 object-contain"
              />
            </div>
            <span className="text-xs text-neutral-500">
              QR พร้อมเพย์ตัวอย่าง • ใช้ชำระเงินจำลอง
            </span>
          </div>

          {/* Bank Account Info */}
          <div className="flex flex-col justify-center space-y-4 text-sm">
            <span className="inline-block px-2.5 py-1 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded w-fit">
              ข้อมูลบัญชีธนาคารสำหรับโอนเงิน
            </span>
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 block">ธนาคาร:</span>
              <p className="font-semibold text-neutral-900 dark:text-white">{order.bankAccount.bank}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 block">ชื่อบัญชี:</span>
              <p className="font-semibold text-neutral-900 dark:text-white">{order.bankAccount.accountName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 block">เลขที่บัญชี:</span>
              <p className="font-mono text-xl font-bold tracking-wider text-neutral-900 dark:text-white">
                {order.bankAccount.accountNumber}
              </p>
            </div>
            <div className="space-y-1 pt-2 border-t border-neutral-200 dark:border-neutral-900">
              <span className="text-xs text-neutral-500 block">ยอดเงินที่ต้องโอน (ยอดตรงเป๊ะ):</span>
              <p className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                ฿{order.totalAmount}
              </p>
            </div>
          </div>
        </div>

        {/* Slip Upload Section */}
        <section className="p-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4 shadow-sm dark:shadow-none">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              แนบสลิปหลักฐานการโอนเงิน
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              รองรับไฟล์รูปภาพ JPEG และ PNG ขนาดไม่เกิน 5 MB
            </p>
          </div>

          {order.orderStatus === "PENDING_PAYMENT" && !isExpired ? (
            <form onSubmit={handleSlipSubmit} className="space-y-4">
              {uploadError && (
                <div
                  id="upload-error"
                  role="alert"
                  aria-live="polite"
                  className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-700/80 rounded text-red-900 dark:text-red-300 text-xs leading-relaxed flex items-center gap-2"
                >
                  <AlertTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg p-6 sm:p-8 text-center bg-neutral-50 dark:bg-neutral-900/40 space-y-3">
                <FileTextIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto" />
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  เลือกไฟล์รูปสลิปที่ต้องการส่ง (JPEG / PNG ไม่เกิน 5 MB)
                </p>
                <input
                  type="file"
                  id="slip-file-input"
                  aria-label="เลือกสลิป JPEG หรือ PNG ไม่เกิน 5 MB"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="text-xs text-neutral-500 dark:text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 dark:file:bg-white dark:file:text-black dark:hover:file:bg-neutral-200 file:cursor-pointer"
                />
              </div>

              {/* Slip Preview */}
              {previewUrl && (
                <div id="slip-preview-container" className="flex flex-col items-center p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">ภาพสลิปที่เลือก:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    id="slip-preview-img"
                    src={previewUrl}
                    alt="Slip Preview"
                    className="max-h-56 object-contain rounded border border-neutral-300 dark:border-neutral-700"
                  />
                  {selectedFile && (
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                id="submit-slip-btn"
                disabled={uploading || !selectedFile}
                className="w-full min-h-[44px] py-3 px-4 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold rounded text-sm transition-colors flex items-center justify-center text-center focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  "กำลังส่งสลิปหลักฐาน..."
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    ส่งสลิปหลักฐานการโอนเงิน <ArrowRightIcon className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          ) : isExpired ? (
            <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-center text-xs text-neutral-500">
              คำสั่งซื้อหมดเวลาแล้ว ไม่สามารถแนบสลิปได้
            </div>
          ) : (
            <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded text-center text-xs text-neutral-600 dark:text-neutral-400">
              สถานะคำสั่งซื้อปัจจุบันคือ <span className="font-mono font-bold text-neutral-900 dark:text-white">{order.orderStatus}</span> ไม่จำเป็นต้องแนบสลิปซ้ำ
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 py-6 text-center text-xs text-neutral-500 dark:text-neutral-600">
        <p>E-Tikket Ticketing Platform • MVP</p>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col transition-colors duration-200 items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
