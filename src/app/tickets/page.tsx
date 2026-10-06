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
} from "@/components/icons";


interface TicketItem {
  ticketNumber: string;
  status: "OUTSIDE" | "INSIDE" | "CANCELLED";
  qrDataUrl: string;
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
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-white selection:text-black">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold tracking-wider text-lg uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-black font-mono">MVP</span>
          </Link>
          <span className="text-xs text-neutral-500 font-mono">
            E-Ticket • แสดงที่ประตูทางเข้า
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-400 font-mono">กำลังตรวจสอบสิทธิ์และโหลดข้อมูลบัตร...</p>
          </div>
        )}

        {/* Error / Denial States */}
        {!loading && errorStatus && (
          <div className="max-w-md mx-auto p-8 border border-neutral-800 bg-neutral-950 rounded-lg text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              {errorStatus === "NOT_FOUND" ? (
                <LockIcon className="w-6 h-6 text-amber-400" />
              ) : errorStatus === "UNAVAILABLE" ? (
                <ServerCrashIcon className="w-6 h-6 text-red-400" />
              ) : (
                <AlertTriangleIcon className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-white">
                {errorStatus === "NOT_FOUND"
                  ? "ไม่พบข้อมูลบัตรเข้างาน"
                  : errorStatus === "UNAVAILABLE"
                    ? "บริการจัดเก็บรูปตั๋วขัดข้องชั่วคราว"
                    : "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2">
              {errorStatus === "UNAVAILABLE" || errorStatus === "ERROR" ? (
                <button
                  onClick={fetchTickets}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-black font-bold text-xs rounded hover:bg-neutral-200 transition-colors"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold text-xs rounded hover:bg-neutral-800 transition-colors"
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
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono font-bold">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                ชำระเงินและออกบัตรสำเร็จ (PAID)
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                บัตรเข้างานของคุณ
              </h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                คำสั่งซื้อ <strong className="text-white font-mono">#{orderInfo.id.slice(0, 10)}...</strong> • ผู้ซื้อ: <strong className="text-white">{orderInfo.customerName}</strong> ({orderInfo.customerEmail})<br />
                กรุณาเปิดหน้านี้และแสดง QR Code ให้พนักงานสแกนที่ประตูทางเข้างาน
              </p>
            </div>

            {/* Ticket Cards List */}
            <div className="space-y-6 max-w-2xl mx-auto">
              {tickets.map((ticket, index) => (
                <div
                  key={ticket.ticketNumber}
                  className="border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden divide-y divide-neutral-900 shadow-xl"
                >
                  {/* Ticket Card Header */}
                  <div className="p-4 bg-neutral-900/40 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-neutral-400">
                      TICKET {index + 1} OF {tickets.length}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold inline-flex items-center gap-1.5 ${
                        ticket.status === "OUTSIDE"
                          ? "bg-neutral-900 border border-neutral-700 text-emerald-400"
                          : ticket.status === "INSIDE"
                            ? "bg-blue-950 border border-blue-600 text-blue-300"
                            : "bg-red-950 border border-red-700 text-red-300"
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
                        <h2 className="text-xl font-extrabold text-white">
                          {orderInfo.event.name}
                        </h2>
                        <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>{orderInfo.event.venue}</span>
                        </p>
                      </div>

                      <div className="text-xs text-neutral-300 space-y-1.5 font-sans">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>วันที่: <strong>{orderInfo.event.eventDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>เวลา: <strong>{orderInfo.event.startTime} น.</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TicketIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>ราคา: <strong>฿{orderInfo.event.ticketPrice}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-900">
                        <span className="text-[11px] text-neutral-500 block">เลขที่บัตร:</span>
                        <span className="font-mono text-sm font-bold text-white tracking-wider">
                          {ticket.ticketNumber}
                        </span>
                      </div>
                    </div>

                    {/* QR Code Presentation Box */}
                    <div className="flex flex-col items-center space-y-2 p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg">
                      <div className="p-2 bg-white rounded-md shadow-inner flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ticket.qrDataUrl}
                          alt={`QR Code สำหรับตั๋ว ${ticket.ticketNumber}`}
                          className="w-44 h-44 object-contain"
                        />
                      </div>

                      <span className="text-[10px] text-neutral-400 font-mono">
                        สแกนเพื่อเข้างาน • ใบที่ {index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Advisory Note */}
            <div className="max-w-2xl mx-auto p-4 bg-neutral-900/30 border border-neutral-900 rounded-lg text-center text-xs text-neutral-500 leading-relaxed flex items-center justify-center gap-2">
              <InfoIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>แนะนำให้บันทึกภาพหน้าจอ (Screenshot) หรือบุ๊กมาร์กลิงก์หน้านี้ไว้เพื่อความสะดวกรวดเร็วเมื่อถึงหน้างาน</span>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-600">
        <p>E-Tikket Ticket View • TICKETBOX MVP</p>
      </footer>
    </div>
  );
}
