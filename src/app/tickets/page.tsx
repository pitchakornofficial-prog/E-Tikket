"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  LockIcon,
  AlertTriangleIcon,
  ServerCrashIcon,
  CheckCircleIcon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  TicketIcon,
  InfoIcon,
  RefreshCwIcon,
  DownloadIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";


interface TicketItem {
  ticketNumber: string;
  status: "OUTSIDE" | "INSIDE" | "CANCELLED";
  qrDataUrl: string;
  reissueCount?: number;
  reissuedFromId?: string | null;
  canReissue?: boolean;
}

interface OrderInfo {
  id: string;
  event: {
    id: string;
    name: string;
    eventDate: string;
    startTime: string;
    venue: string;
    ticketPrice: string;
  };
  quantity: number;
  customerName: string;
  customerEmail: string;
}

interface TicketsPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function TicketsPage({ searchParams }: TicketsPageProps) {
  const resolvedParams = use(searchParams);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<"NOT_FOUND" | "UNAVAILABLE" | "ERROR" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [downloadingTicket, setDownloadingTicket] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Leaked QR Reissue state
  const [reissueModalTicket, setReissueModalTicket] = useState<TicketItem | null>(null);
  const [reissuing, setReissuing] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);
  const [reissueSuccess, setReissueSuccess] = useState<string | null>(null);

  const handleReissueTicket = async (ticket: TicketItem) => {
    if (!token) return;
    setReissuing(true);
    setReissueError(null);

    try {
      const res = await fetch("/api/tickets/reissue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ticketNumber: ticket.ticketNumber,
          reason: "QR Code Leaked",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReissueError(data.error || "เกิดข้อผิดพลาดในการยกเลิกและออกบัตรใหม่");
        return;
      }

      setReissueSuccess(data.message || `ออกบัตรใหม่ ${data.newTicketNumber} เรียบร้อยแล้ว`);
      setReissueModalTicket(null);
      await fetchTickets();
    } catch {
      setReissueError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setReissuing(false);
    }
  };

  const handleDownload = async (ticketNumber?: string) => {
    if (!token) return;
    const target = ticketNumber || "ALL";
    setDownloadingTicket(target);
    setDownloadError(null);

    try {
      const url = ticketNumber
        ? `/api/tickets/download?token=${encodeURIComponent(token)}&ticket=${encodeURIComponent(ticketNumber)}`
        : `/api/tickets/download?token=${encodeURIComponent(token)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "ไม่สามารถดาวน์โหลดไฟล์ PDF ได้");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = ticketNumber
        ? `ticket-${ticketNumber}.pdf`
        : `tickets-order-${orderInfo?.id.slice(0, 8) || "tickets"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดาวน์โหลด PDF");
    } finally {
      setDownloadingTicket(null);
    }
  };

  const fetchTickets = useCallback(async () => {
    if (!token) {
      setErrorStatus("NOT_FOUND");
      setErrorMessage("ไม่พบคีย์การเข้าถึงบัตรเข้างาน กรุณาเปิดลิงก์ที่ได้รับจากอีเมลยืนยันการสั่งซื้อ");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tickets/view?token=${encodeURIComponent(token)}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setErrorStatus("NOT_FOUND");
          setErrorMessage(data.error?.message || "ไม่พบข้อมูลบัตรเข้างาน หรือลิงก์การเข้าถึงไม่ถูกต้อง");
        } else if (res.status === 503) {
          setErrorStatus("UNAVAILABLE");
          setErrorMessage(data.error?.message || "ไม่สามารถโหลดรูป QR Code สำหรับเข้างานได้ในขณะนี้ กรุณารองรับและลองใหม่อีกครั้ง");
        } else {
          setErrorStatus("ERROR");
          setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูลบัตรเข้างาน");
        }
        setLoading(false);
        return;
      }

      setOrderInfo(data.order);
      setTickets(data.tickets);
      setLoading(false);
    } catch {
      setErrorStatus("ERROR");
      setErrorMessage("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);


  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans flex flex-col transition-colors duration-200 selection:bg-white selection:text-black">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-900 bg-white/90 dark:bg-neutral-950/90 backdrop-blur sticky top-0 z-40 transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold tracking-wider text-lg uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black font-mono">MVP</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
              E-Ticket • แสดงที่ประตูทางเข้า
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-10 h-10 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">กำลังตรวจสอบสิทธิ์และโหลดข้อมูลบัตร...</p>
          </div>
        )}

        {/* Error / Denial States */}
        {!loading && errorStatus && (
          <div className="max-w-md mx-auto p-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-lg text-center space-y-5 shadow-sm dark:shadow-none">
            <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-500 dark:text-neutral-400">
              {errorStatus === "NOT_FOUND" ? (
                <LockIcon className="w-6 h-6 text-amber-500" />
              ) : errorStatus === "UNAVAILABLE" ? (
                <ServerCrashIcon className="w-6 h-6 text-red-500" />
              ) : (
                <AlertTriangleIcon className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {errorStatus === "NOT_FOUND"
                  ? "ไม่พบข้อมูลบัตรเข้างาน"
                  : errorStatus === "UNAVAILABLE"
                    ? "บริการจัดเก็บรูปตั๋วขัดข้องชั่วคราว"
                    : "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
              </h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2">
              {errorStatus === "UNAVAILABLE" || errorStatus === "ERROR" ? (
                <button
                  onClick={fetchTickets}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-bold text-xs rounded dark:hover:bg-neutral-200 transition-colors"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300 font-bold text-xs rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" /> กลับหน้าหลัก
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Success State: Show Order Info and Ticket Cards */}
        {!loading && !errorStatus && orderInfo && (
          <>
            {/* Order & Event Header Banner */}
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-600 text-emerald-900 dark:text-emerald-300 font-mono font-bold">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                ชำระเงินและออกบัตรสำเร็จ (PAID)
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                บัตรเข้างานของคุณ
              </h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                คำสั่งซื้อ <strong className="text-neutral-900 dark:text-white font-mono">#{orderInfo.id.slice(0, 10)}...</strong> • ผู้ซื้อ: <strong className="text-neutral-900 dark:text-white">{orderInfo.customerName}</strong> ({orderInfo.customerEmail})<br />
                กรุณาเปิดหน้านี้และแสดง QR Code ให้พนักงานสแกนที่ประตูทางเข้างาน
              </p>
            </div>

            {/* Download Error Banner */}
            {downloadError && (
              <div className="max-w-2xl mx-auto p-3.5 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg text-center text-xs text-red-900 dark:text-red-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                  <span>{downloadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDownloadError(null)}
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {reissueSuccess && (
              <div className="max-w-2xl mx-auto p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{reissueSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReissueSuccess(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-black dark:hover:text-white p-1"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Batch Download Button (AC-05, AC-06: for 2+ tickets) */}
            {tickets.length >= 2 && (
              <div className="max-w-2xl mx-auto flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-900">
                <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                  มีตั๋วทั้งหมด {tickets.length} ใบในคำสั่งซื้อนี้
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload()}
                  disabled={!!downloadingTicket}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-md"
                >
                  {downloadingTicket === "ALL" ? (
                    <>
                      <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังสร้าง PDF ทั้งหมด...</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลดทั้งหมด ({tickets.length} ใบ)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Ticket Cards List */}
            <div className="space-y-6 max-w-2xl mx-auto">
              {tickets.map((ticket, index) => (
                <div
                  key={ticket.ticketNumber}
                  className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-xl overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-900 shadow-sm dark:shadow-xl"
                >
                  {/* Ticket Card Header */}
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900/40 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400">
                        TICKET {index + 1} OF {tickets.length}
                      </span>
                      {ticket.reissuedFromId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold">
                          ออกใหม่ทดแทน
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold inline-flex items-center gap-1.5 ${
                        ticket.status === "OUTSIDE"
                          ? "bg-neutral-100 text-emerald-800 border border-neutral-300 dark:bg-neutral-900 dark:border-neutral-700 dark:text-emerald-400"
                          : ticket.status === "INSIDE"
                            ? "bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-300"
                            : "bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:border-red-700 dark:text-red-300"
                      }`}
                    >
                      {ticket.status === "OUTSIDE" && (
                        <>
                          <ArrowRightIcon className="w-3 h-3" /> OUTSIDE • พร้อมเข้างาน
                        </>
                      )}
                      {ticket.status === "INSIDE" && (
                        <>
                          <CheckIcon className="w-3 h-3 stroke-[3]" /> INSIDE • อยู่ในงานแล้ว
                        </>
                      )}
                      {ticket.status === "CANCELLED" && (
                        <>
                          <XIcon className="w-3 h-3" /> CANCELLED • บัตรถูกยกเลิก
                        </>
                      )}
                    </span>
                  </div>

                  {/* Ticket Body: Details on left, QR on right (or stacked on mobile) */}
                  <div className="p-6 flex flex-col sm:flex-row gap-6 items-center justify-between">
                    <div className="space-y-4 flex-1 w-full sm:w-auto text-left">
                      <div>
                        <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                          {orderInfo.event.name}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                            <MapPinIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                            <span>{orderInfo.event.venue}</span>
                          </p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orderInfo.event.venue)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 transition-colors"
                          >
                            <span>ดูแผนที่นำทาง</span>
                            <ArrowRightIcon className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5 font-sans">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                          <span>วันที่: <strong>{orderInfo.event.eventDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                          <span>เวลา: <strong>{orderInfo.event.startTime} น.</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TicketIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                          <span>ราคา: <strong>฿{orderInfo.event.ticketPrice}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-900">
                        <span className="text-[11px] text-neutral-500 block">เลขที่บัตร:</span>
                        <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white tracking-wider">
                          {ticket.ticketNumber}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Presentation Box & Individual Download Button */}
                    <div className="flex flex-col items-center space-y-2 p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg w-full sm:w-auto">
                      <div className="p-2 bg-white rounded-md shadow-inner flex items-center justify-center border border-neutral-200 dark:border-transparent">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ticket.qrDataUrl}
                          alt={`QR Code สำหรับตั๋ว ${ticket.ticketNumber}`}
                          className="w-44 h-44 object-contain"
                        />
                      </div>

                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                        สแกนเพื่อเข้างาน • ใบที่ {index + 1}
                      </span>

                      {/* Download PDF Button (AC-04, AC-10) */}
                      <button
                        type="button"
                        onClick={() => handleDownload(ticket.ticketNumber)}
                        disabled={!!downloadingTicket}
                        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                        aria-label={`ดาวน์โหลด PDF บัตร ${ticket.ticketNumber}`}
                      >
                        {downloadingTicket === ticket.ticketNumber ? (
                          <>
                            <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังสร้าง PDF...</span>
                          </>
                        ) : (
                          <>
                            <DownloadIcon className="w-3.5 h-3.5" />
                            <span>ดาวน์โหลด PDF</span>
                          </>
                        )}
                      </button>

                      {/* Leaked QR Report / Reissue Button */}
                      {ticket.status === "OUTSIDE" && ticket.canReissue && (
                        <button
                          type="button"
                          onClick={() => {
                            setReissueModalTicket(ticket);
                            setReissueError(null);
                          }}
                          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800/80 text-[11px] font-semibold rounded-md transition-colors"
                        >
                          <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>แจ้ง QR หลุด / ขอออกบัตรใหม่</span>
                        </button>
                      )}

                      {ticket.status === "CANCELLED" && (
                        <div className="w-full mt-2 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded text-[10px] text-rose-700 dark:text-rose-400 text-center font-medium">
                          บัตรใบนี้ถูกยกเลิกแล้ว (ไม่สามารถใช้สแกนได้)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Advisory Note */}
            <div className="max-w-2xl mx-auto p-4 bg-neutral-100 dark:bg-neutral-900/30 border border-neutral-200 dark:border-neutral-900 rounded-lg text-center text-xs text-neutral-600 dark:text-neutral-500 leading-relaxed flex items-center justify-center gap-2">
              <InfoIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <span>แนะนำให้บันทึกภาพหน้าจอ (Screenshot) หรือบุ๊กมาร์กลิงก์หน้านี้ไว้เพื่อความสะดวกรวดเร็วเมื่อถึงหน้างาน</span>
            </div>
          </>
        )}

        {/* Modal: Leaked QR Reissue Confirmation */}
        {reissueModalTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangleIcon className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                    ยกเลิกบัตรเดิม & ขอออกบัตรใหม่
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!reissuing) setReissueModalTicket(null);
                  }}
                  disabled={reissuing}
                  className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-3 leading-relaxed">
                <p>
                  คุณกำลังจะขอยกเลิกบัตรเลขที่{" "}
                  <strong className="text-neutral-900 dark:text-white font-mono">
                    {reissueModalTicket.ticketNumber}
                  </strong>
                </p>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-amber-800 dark:text-amber-300">
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    ⚠️ โปรดอ่านข้อกำหนดอย่างละเอียด:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90">
                    <li>
                      <strong>QR Code เดิมจะถูกยกเลิกทันที:</strong> หากมีผู้อื่นนำไปสแกนที่หน้างาน
                      ระบบจะปฏิเสธการเข้างาน (CANCELLED)
                    </li>
                    <li>
                      <strong>ออก QR Code ชุดใหม่ทันที:</strong>{" "}
                      ระบบจะออกตั๋วใบใหม่พร้อมรหัสเข้ารหัสใหม่ให้คุณใช้งานแทน
                    </li>
                    <li>
                      <strong>จำกัดสิทธิ์ 1 ครั้ง:</strong> บัตรแต่ละใบสามารถขอออกใหม่ได้เพียง 1 ครั้งเท่านั้น
                      และทำได้เฉพาะก่อนงานเริ่ม
                    </li>
                  </ul>
                </div>

                {reissueError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                    <span>{reissueError}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReissueModalTicket(null)}
                  disabled={reissuing}
                  className="flex-1 py-2 px-4 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleReissueTicket(reissueModalTicket)}
                  disabled={reissuing}
                  className="flex-1 py-2 px-4 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
                >
                  {reissuing ? (
                    <>
                      <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังออกบัตรใหม่...</span>
                    </>
                  ) : (
                    <span>ยืนยันออกบัตรใหม่</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-900 py-6 text-center text-xs text-neutral-500 dark:text-neutral-600">
        <p>E-Tikket Ticket View • TICKETBOX MVP</p>
      </footer>
    </div>
  );
}
