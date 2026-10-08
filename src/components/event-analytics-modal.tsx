"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChartIcon,
  TrendingUpIcon,
  ClockIcon,
  UsersIcon,
  XIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckIcon,
} from "@/components/icons";

interface SalesTrendItem {
  date: string;
  displayDate: string;
  tickets: number;
  revenue: number;
  ordersCount: number;
}

interface CheckinDistributionItem {
  hourKey: string;
  timeSlot: string;
  count: number;
}

interface CheckerStatItem {
  name: string;
  gateNote: string | null;
  count: number;
}

interface AnalyticsData {
  event: {
    id: string;
    name: string;
    eventDate: string;
    startTime: string;
    venue: string;
    ticketPrice: number;
    totalTickets: number;
  };
  kpis: {
    totalSold: number;
    totalTickets: number;
    totalRevenue: number;
    insideCount: number;
    checkinRatePercent: string;
    peakTimeSlot: string;
    peakScanCount: number;
    avgTicketsPerOrder: string;
    paidOrdersCount: number;
  };
  salesTrend: SalesTrendItem[];
  checkinDistribution: CheckinDistributionItem[];
  checkerStats: CheckerStatItem[];
}

interface EventAnalyticsModalProps {
  eventId: string;
  onClose: () => void;
}

export function EventAnalyticsModal({ eventId, onClose }: EventAnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "SALES" | "TRAFFIC" | "STAFF">("ALL");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/analytics`, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        let msg = "ไม่สามารถโหลดข้อมูลสถิติของคอนเสิร์ตได้";
        try {
          const err = await res.json();
          if (err.error) msg = err.error;
        } catch {
          // fallback
        }
        setErrorMsg(msg);
        return;
      }
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Max values for chart height ratios
  const maxSalesTickets = useMemo(() => {
    if (!data || data.salesTrend.length === 0) return 1;
    return Math.max(...data.salesTrend.map((s) => s.tickets), 1);
  }, [data]);

  const maxTrafficCount = useMemo(() => {
    if (!data || data.checkinDistribution.length === 0) return 1;
    return Math.max(...data.checkinDistribution.map((t) => t.count), 1);
  }, [data]);

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 mb-1">
              <BarChartIcon className="w-3.5 h-3.5" />
              <span>EVENT ANALYTICS & TRAFFIC DASHBOARD</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white truncate">
              {data ? data.event.name : "กำลังโหลดข้อมูลสถิติ..."}
            </h2>
            {data && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>สถานที่: {data.event.venue}</span>
                <span>
                  วันแสดง: {formatThaiDate(data.event.eventDate)} ({data.event.startTime} น.)
                </span>
                <span>ราคาบัตร: ฿{data.event.ticketPrice.toLocaleString()}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
              <p className="text-sm text-neutral-500">กำลังประมวลผลข้อมูลสถิติและวิเคราะห์ช่วงเวลาเข้างาน...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                <p className="font-bold">{errorMsg}</p>
              </div>
              <button
                onClick={fetchAnalytics}
                className="underline text-xs"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : data ? (
            <>
              {/* Top Overview KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-neutral-500 font-medium">ยอดจำหน่ายบัตร</span>
                  <div className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white font-mono">
                    {data.kpis.totalSold} / {data.kpis.totalTickets} ใบ
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className="bg-neutral-900 dark:bg-white h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          data.kpis.totalTickets > 0
                            ? (data.kpis.totalSold / data.kpis.totalTickets) * 100
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-neutral-500 font-medium">ยอดขายรวมทั้งหมด</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ฿{data.kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    เฉลี่ย {data.kpis.avgTicketsPerOrder} ใบ / คำสั่งซื้อ
                  </span>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1">
                  <span className="text-[11px] text-neutral-500 font-medium">อัตราการเข้างาน (Check-in)</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {data.kpis.checkinRatePercent}%
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    เข้างานแล้ว {data.kpis.insideCount} จาก {data.kpis.totalSold} ใบ
                  </span>
                </div>

                <div className="p-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl space-y-1 shadow-md">
                  <span className="text-[11px] text-neutral-300 dark:text-neutral-700 font-medium flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                    <span>ช่วงเวลาเข้างานหนาแน่นสุด</span>
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono">
                    {data.kpis.peakTimeSlot !== "-" ? data.kpis.peakTimeSlot : "ยังไม่มีข้อมูล"}
                  </div>
                  {data.kpis.peakScanCount > 0 && (
                    <span className="text-[10px] text-neutral-300 dark:text-neutral-700 font-bold">
                      หนาแน่นสุด: {data.kpis.peakScanCount} คน/ช่วง
                    </span>
                  )}
                </div>
              </div>

              {/* View Filter Tabs */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-2">
                {[
                  { key: "ALL", label: "ภาพรวมทั้งหมด" },
                  { key: "SALES", label: "📈 แนวโน้มยอดขาย (Sales Trend)" },
                  { key: "TRAFFIC", label: "⏱️ คนเข้างานหนาแน่น (Peak Traffic)" },
                  { key: "STAFF", label: "👥 สถิติเจ้าหน้าที่ตรวจบัตร" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as typeof activeTab)}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition -mb-px ${
                      activeTab === t.key
                        ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                        : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Chart 1: Daily Ticket Sales Timeline */}
              {(activeTab === "ALL" || activeTab === "SALES") && (
                <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <TrendingUpIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>แนวโน้มยอดขายบัตรรายวัน (Daily Ticket Sales Timeline)</span>
                      </h3>
                      <p className="text-xs text-neutral-500">
                        แสดงจำนวนบัตรและรายได้ที่จำหน่ายได้ในแต่ละวันก่อนถึงวันจัดงาน
                      </p>
                    </div>

                    <div className="text-xs font-mono text-neutral-400">
                      ทั้งหมด {data.salesTrend.length} วันที่มีการสั่งซื้อ
                    </div>
                  </div>

                  {data.salesTrend.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                      ยังไม่มีคำสั่งซื้อที่ชำระเงินสำเร็จ
                    </div>
                  ) : (
                    <div className="space-y-2 pt-4">
                      {/* Responsive Vertical Bar Visualization */}
                      <div className="h-48 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-6 pt-6 border-b border-neutral-200 dark:border-neutral-800">
                        {data.salesTrend.map((s, idx) => {
                          const heightPercent = Math.max(
                            8,
                            Math.round((s.tickets / maxSalesTickets) * 100)
                          );
                          const isMax = s.tickets === maxSalesTickets && maxSalesTickets > 0;

                          return (
                            <div
                              key={idx}
                              className="flex-1 min-w-[36px] max-w-[64px] flex flex-col items-center gap-1.5 group relative"
                            >
                              {/* Hover Tooltip */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                                <div className="bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-mono p-2 rounded shadow-lg whitespace-nowrap">
                                  <div className="font-bold">{s.date}</div>
                                  <div>ขายได้: {s.tickets} ใบ</div>
                                  <div>ยอดเงิน: ฿{s.revenue.toLocaleString()}</div>
                                  <div>คำสั่งซื้อ: {s.ordersCount} ออเดอร์</div>
                                </div>
                                <div className="w-2 h-2 bg-neutral-900 dark:bg-white rotate-45 -mt-1" />
                              </div>

                              <span className="text-[10px] font-mono text-neutral-500 font-bold">
                                {s.tickets}
                              </span>

                              {/* Bar */}
                              <div className="w-full bg-neutral-100 dark:bg-neutral-900 rounded-t-md overflow-hidden flex flex-col justify-end h-32">
                                <div
                                  className={`w-full rounded-t-md transition-all duration-300 ${
                                    isMax
                                      ? "bg-emerald-600 dark:bg-emerald-400"
                                      : "bg-neutral-800 dark:bg-neutral-200 group-hover:bg-neutral-900 dark:group-hover:bg-white"
                                  }`}
                                  style={{ height: `${heightPercent}%` }}
                                />
                              </div>

                              <span className="text-[9px] font-mono text-neutral-400 rotate-45 sm:rotate-0 mt-1 whitespace-nowrap">
                                {s.displayDate}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-neutral-400 pt-1">
                        <span>💡 เอาเมาส์ชี้ที่แท่งกราฟเพื่อดูรายละเอียดยอดเงินและจำนวนออเดอร์ในแต่ละวัน</span>
                        <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span>วันที่มียอดขายสูงสุด</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chart 2: Hourly Gate Arrival Traffic Curve */}
              {(activeTab === "ALL" || activeTab === "TRAFFIC") && (
                <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-amber-500" />
                        <span>ช่วงเวลาที่คนสแกนเข้างานหนาแน่น (Peak Check-in Traffic Analysis)</span>
                      </h3>
                      <p className="text-xs text-neutral-500">
                        วิเคราะห์ปริมาณผู้เข้างานในแต่ละชั่วโมง เพื่อใช้บริหารจัดการประตูและเจ้าหน้าที่
                      </p>
                    </div>

                    {data.kpis.peakTimeSlot !== "-" && (
                      <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono">
                        🔥 Peak: {data.kpis.peakTimeSlot} ({data.kpis.peakScanCount} คน)
                      </div>
                    )}
                  </div>

                  {data.checkinDistribution.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                      ยังไม่มีประวัติการสแกนบัตรเข้างาน
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        {data.checkinDistribution.map((slot) => {
                          const percentOfMax = Math.round((slot.count / maxTrafficCount) * 100);
                          const isPeak = slot.count === data.kpis.peakScanCount && data.kpis.peakScanCount > 0;

                          return (
                            <div key={slot.hourKey} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className={`font-mono font-bold flex items-center gap-1.5 ${isPeak ? "text-amber-600 dark:text-amber-400" : "text-neutral-700 dark:text-neutral-300"}`}>
                                  {isPeak && <span>🔥</span>}
                                  <span>{slot.timeSlot} น.</span>
                                </span>
                                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                                  {slot.count} คน ({data.kpis.insideCount > 0 ? ((slot.count / data.kpis.insideCount) * 100).toFixed(1) : 0}%)
                                </span>
                              </div>

                              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className={`h-2.5 rounded-full transition-all duration-300 ${
                                    isPeak
                                      ? "bg-amber-500"
                                      : "bg-neutral-900 dark:bg-neutral-300"
                                  }`}
                                  style={{ width: `${percentOfMax}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-500">
                        💡 <strong>คำแนะนำหน้างาน:</strong> จัดกำลังเจ้าหน้าที่ตรวจบัตรให้พร้อมเต็มอัตราก่อนถึงช่วงเวลา Peak อย่างน้อย 15-30 นาทีเพื่อลดแถวคอยที่ประตู
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Gate Staff & Scanner Distribution */}
              {(activeTab === "ALL" || activeTab === "STAFF") && (
                <div className="p-5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-neutral-500" />
                      <span>สถิติการสแกนตรวจบัตรแยกตามเจ้าหน้าที่ & ประตู (Staff Gate Performance)</span>
                    </h3>
                    <p className="text-xs text-neutral-500">
                      ตรวจสอบปริมาณการสแกนของเจ้าหน้าที่ตรวจบัตรแต่ละคน
                    </p>
                  </div>

                  {data.checkerStats.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                      ยังไม่มีเจ้าหน้าที่ตรวจบัตร
                    </div>
                  ) : (
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2.5 px-4">ชื่อเจ้าหน้าที่</th>
                            <th className="py-2.5 px-4">จุดตรวจ / ประตู</th>
                            <th className="py-2.5 px-4">จำนวนที่สแกนสำเร็จ</th>
                            <th className="py-2.5 px-4">สัดส่วนผู้เข้างาน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                          {data.checkerStats.map((st, idx) => {
                            const percent =
                              data.kpis.insideCount > 0
                                ? ((st.count / data.kpis.insideCount) * 100).toFixed(1)
                                : "0";

                            return (
                              <tr
                                key={idx}
                                className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition"
                              >
                                <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                                  {st.count > 0 && (
                                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  )}
                                  <span>{st.name}</span>
                                </td>
                                <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400 font-mono">
                                  {st.gateNote || "-"}
                                </td>
                                <td className="py-3 px-4 font-bold font-mono text-neutral-900 dark:text-white">
                                  {st.count.toLocaleString()} ใบ
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 max-w-[80px] overflow-hidden">
                                      <div
                                        className="bg-neutral-900 dark:bg-white h-1.5 rounded-full"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[11px] text-neutral-500">
                                      {percent}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 flex justify-between items-center">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรชข้อมูลสถิติ</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-bold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
