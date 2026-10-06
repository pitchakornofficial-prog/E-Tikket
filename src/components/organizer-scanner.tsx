"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  CameraIcon,
  BanIcon,
  CheckCircleIcon,
  WalkIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  PauseIcon,
} from "@/components/icons";

interface EventItem {
  id: string;
  name: string;
  eventDate: string;
  startTime: string;
  venue: string;
  status: string;
}

interface ScanRecord {
  id: string;
  action: "CHECK_IN" | "CHECK_OUT";
  result: "VALID" | "ALREADY_CHECKED_IN" | "INVALID_ACTION" | "CANCELLED" | "WRONG_EVENT" | "UNPAID" | "INVALID";
  scannedAt: string;
  ticketNumber: string | null;
  staffName: string;
}

interface ScanResultData {
  result: "VALID" | "ALREADY_CHECKED_IN" | "INVALID_ACTION" | "CANCELLED" | "WRONG_EVENT" | "UNPAID" | "INVALID" | "SCAN_UNCONFIRMED" | "ERROR";
  action: "CHECK_IN" | "CHECK_OUT";
  eventId: string;
  scannedAt?: string;
  ticket?: {
    ticketNumber: string;
    status: string;
  };
  errorMessage?: string;
}

export function OrganizerScanner() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [action, setAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

  // Camera states
  const [cameraState, setCameraState] = useState<"IDLE" | "REQUESTING" | "ACTIVE" | "DENIED" | "UNAVAILABLE">("IDLE");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scan gating states (AC-23)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRequestIdRef = useRef(0);
  const isAwaitingAcknowledgmentRef = useRef<boolean>(false);

  // Keep ref in sync with scanResult
  useEffect(() => {
    isAwaitingAcknowledgmentRef.current = scanResult !== null || isSubmitting;
  }, [scanResult, isSubmitting]);

  // 1. Fetch organizer's owned events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/organizer/checkin/recent");
        if (!res.ok) {
          throw new Error("Failed to load events");
        }
        const data = await res.json();
        setEvents(data.events || []);
        if (data.events && data.events.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      } catch {
        // Handled as empty state
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, []);

  // 2. Fetch recent scans for selected event
  const loadRecentScans = useCallback(async (eventId: string) => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/organizer/checkin/recent?eventId=${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.scans || []);
      }
    } catch {
      // Ignore background refresh failure
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadRecentScans(selectedEventId);
    }
  }, [selectedEventId, loadRecentScans]);

  // 3. Release camera resources without changing UI state. This is safe to use
  // from effect cleanup, which can run as part of a state-driven rerender.
  const releaseCamera = useCallback(() => {
    cameraRequestIdRef.current += 1;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // 4. Start camera stream
  const startCamera = useCallback(async () => {
    releaseCamera();
    const requestId = cameraRequestIdRef.current;
    setCameraState("REQUESTING");
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("UNAVAILABLE");
      setCameraError("เบราว์เซอร์หรือบริบทนี้ไม่รองรับการเปิดกล้อง (ต้องใช้งานผ่าน HTTPS หรือ localhost)");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setCameraState("ACTIVE");
    } catch (err: unknown) {
      if (requestId !== cameraRequestIdRef.current) {
        return;
      }

      const errorObj = err as Error;
      if (errorObj.name === "NotAllowedError" || errorObj.name === "PermissionDeniedError") {
        setCameraState("DENIED");
        setCameraError("คุณปฏิเสธการให้สิทธิ์เข้าถึงกล้อง กรุณาอนุญาตให้เข้าถึงกล้องในการตั้งค่าเบราว์เซอร์");
      } else {
        setCameraState("UNAVAILABLE");
        setCameraError(errorObj.message || "ไม่สามารถเชื่อมต่ออุปกรณ์กล้องได้");
      }
    }
  }, [releaseCamera]);

  // Start once for the selected event. Camera state changes must not restart
  // this effect; cleanup only releases resources and invalidates pending opens.
  useEffect(() => {
    if (selectedEventId) {
      void startCamera();
    }
    return () => {
      releaseCamera();
    };
  }, [selectedEventId, startCamera, releaseCamera]);

  // 5. Submit decoded QR token to API
  const handleScanDetected = useCallback(
    async (decodedToken: string) => {
      if (isAwaitingAcknowledgmentRef.current || !selectedEventId) {
        return;
      }

      isAwaitingAcknowledgmentRef.current = true;
      setIsSubmitting(true);

      try {
        const res = await fetch("/api/organizer/checkin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: selectedEventId,
            qrToken: decodedToken,
            action,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setScanResult({
            result: data.result,
            action: data.action,
            eventId: data.eventId,
            scannedAt: data.scannedAt,
            ticket: data.ticket,
          });
        } else {
          setScanResult({
            result: data.error?.code === "SCAN_UNCONFIRMED" ? "SCAN_UNCONFIRMED" : "ERROR",
            action,
            eventId: selectedEventId,
            errorMessage: data.error?.message || "การส่งคำขอสแกนล้มเหลว",
          });
        }
      } catch {
        setScanResult({
          result: "SCAN_UNCONFIRMED",
          action,
          eventId: selectedEventId,
          errorMessage: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ต",
        });
      } finally {
        setIsSubmitting(false);
        // Refresh recent scans audit list
        loadRecentScans(selectedEventId);
      }
    },
    [selectedEventId, action, loadRecentScans],
  );

  // 6. Camera frame processing loop
  useEffect(() => {
    if (cameraState !== "ACTIVE") return;

    let isActive = true;

    const processFrame = () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (!isAwaitingAcknowledgmentRef.current) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data && code.data.trim().length > 0) {
              handleScanDetected(code.data.trim());
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [cameraState, handleScanDetected]);

  // 7. Acknowledgment handler: "สแกนคนถัดไป" (AC-23)
  const handleAcknowledgeNext = () => {
    setScanResult(null);
    setIsSubmitting(false);
    isAwaitingAcknowledgmentRef.current = false;
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const scanControlsDisabled = isSubmitting || scanResult !== null;

  return (
    <div className="space-y-6 max-w-xl mx-auto w-full">
      {/* 1. Event & Action Selector Card */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
        {loadingEvents ? (
          <div className="text-center py-4 text-xs text-neutral-400 font-mono">
            กำลังโหลดรายชื่องานแสดง...
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center gap-2 text-center py-4 text-xs text-amber-400 bg-amber-950/20 border border-amber-900 rounded p-3">
            <AlertTriangleIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ยังไม่มีงานแสดงที่คุณเป็นผู้จัด กรุณาสร้างงานแสดงก่อนเริ่มใช้งานระบบสแกน</span>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="event-select" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                เลือกงานแสดง (Selected Event):
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                }}
                disabled={scanControlsDisabled}
                className="w-full bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg p-3 font-semibold focus:outline-none focus:border-white transition-colors"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.eventDate} @ {ev.venue})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="action-select" className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                โหมดการสแกนบัตร (Scan Action):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="action-checkin-btn"
                  onClick={() => setAction("CHECK_IN")}
                  disabled={scanControlsDisabled}
                  className={`py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    action === "CHECK_IN"
                      ? "bg-white text-black shadow-lg shadow-white/10"
                      : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
                  }`}
                >
                  <span>↘ เข้างาน</span>
                  <span className="font-mono text-[10px]">(CHECK_IN)</span>
                </button>
                <button
                  type="button"
                  id="action-checkout-btn"
                  onClick={() => setAction("CHECK_OUT")}
                  disabled={scanControlsDisabled}
                  className={`py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    action === "CHECK_OUT"
                      ? "bg-white text-black shadow-lg shadow-white/10"
                      : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
                  }`}
                >
                  <span>↗ ออกชั่วคราว</span>
                  <span className="font-mono text-[10px]">(CHECK_OUT)</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2 font-mono">
                {action === "CHECK_IN"
                  ? "• CHECK_IN: เปลี่ยนสถานะ OUTSIDE → INSIDE (อนุญาตให้เข้างาน)"
                  : "• CHECK_OUT: เปลี่ยนสถานะ INSIDE → OUTSIDE (เพื่ออนุญาตให้กลับเข้างานใหม่ได้)"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* 2. Real Camera Viewfinder */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden relative shadow-2xl">
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {/* Video display */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraState === "ACTIVE" ? "block" : "hidden"}`}
            muted
            playsInline
          />
          {/* Hidden canvas for image decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Viewfinder Crosshair Overlays */}
          {cameraState === "ACTIVE" && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-dashed border-white/60 rounded-2xl relative">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white rounded-br" />

                {/* Laser animation line */}
                {!scanResult && !isSubmitting && (
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse" />
                )}
              </div>
            </div>
          )}

          {/* Camera Status Feedback */}
          {cameraState === "REQUESTING" && (
            <div className="text-center p-6 space-y-3">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 font-mono">กำลังขอสิทธิ์เข้าถึงกล้องและเริ่มการทำงาน...</p>
            </div>
          )}

          {cameraState === "DENIED" && (
            <div className="text-center p-6 space-y-3 max-w-sm">
              <BanIcon className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-xs text-red-400">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-black font-bold text-xs rounded hover:bg-neutral-200 transition-colors"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>ลองขอสิทธิ์อีกครั้ง</span>
              </button>
            </div>
          )}

          {cameraState === "UNAVAILABLE" && (
            <div className="text-center p-6 space-y-3 max-w-sm">
              <CameraIcon className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-xs text-amber-400">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 border border-neutral-700 text-white font-bold text-xs rounded hover:bg-neutral-800 transition-colors"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          )}

          {/* Submitting Overlay inside Viewfinder */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3 z-10 backdrop-blur-sm">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-white font-mono font-bold">กำลังตรวจสอบความถูกต้องของบัตร...</p>
            </div>
          )}
        </div>

        {/* Viewfinder footer note */}
        <div className="p-3 bg-neutral-900/60 border-t border-neutral-900 flex justify-between items-center text-xs">
          <span className="text-neutral-400 font-mono">
            {selectedEvent ? `งาน: ${selectedEvent.name}` : "ยังไม่ได้เลือกงาน"}
          </span>
          <span className="font-mono text-[11px] text-neutral-500 inline-flex items-center gap-1">
            {cameraState === "ACTIVE" ? (
              isAwaitingAcknowledgmentRef.current ? (
                <>
                  <PauseIcon className="w-3 h-3 text-amber-400" /> พักการสแกน
                </>
              ) : (
                "● กำลังตรวจจับ QR"
              )
            ) : (
              "○ ปิดกล้อง"
            )}
          </span>
        </div>
      </div>

      {/* 3. Below-Camera Scan Result Panel (AC-23, D-07) */}
      {scanResult && (
        <section
          id="scan-result-panel"
          role="status"
          aria-live="polite"
          className={`p-6 rounded-xl border text-center space-y-4 shadow-2xl transition-all ${
            scanResult.result === "VALID"
              ? "bg-emerald-950/40 border-emerald-500 text-emerald-200"
              : scanResult.result === "ALREADY_CHECKED_IN" || scanResult.result === "INVALID_ACTION"
                ? "bg-amber-950/40 border-amber-500 text-amber-200"
                : "bg-red-950/40 border-red-500 text-red-200"
          }`}
        >
          {/* Result Icon */}
          <div className="flex justify-center">
            {scanResult.result === "VALID" &&
              (scanResult.action === "CHECK_IN" ? (
                <CheckCircleIcon className="w-16 h-16 text-emerald-400" />
              ) : (
                <WalkIcon className="w-16 h-16 text-emerald-400" />
              ))}
            {(scanResult.result === "ALREADY_CHECKED_IN" || scanResult.result === "INVALID_ACTION") && (
              <AlertTriangleIcon className="w-16 h-16 text-amber-400" />
            )}
            {(scanResult.result === "WRONG_EVENT" || scanResult.result === "UNPAID" || scanResult.result === "INVALID") && (
              <XCircleIcon className="w-16 h-16 text-red-400" />
            )}
            {scanResult.result === "CANCELLED" && (
              <BanIcon className="w-16 h-16 text-red-400" />
            )}
            {(scanResult.result === "SCAN_UNCONFIRMED" || scanResult.result === "ERROR") && (
              <AlertCircleIcon className="w-16 h-16 text-amber-400" />
            )}
          </div>

          {/* Result Title */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {scanResult.result === "VALID" &&
                (scanResult.action === "CHECK_IN"
                  ? "ผ่าน • ตรวจสอบสิทธิ์สำเร็จ (VALID)"
                  : "ผ่าน • ออกจากงานชั่วคราว (VALID)")}
              {scanResult.result === "ALREADY_CHECKED_IN" && "บัตรเข้างานไปแล้ว (ALREADY CHECKED IN)"}
              {scanResult.result === "INVALID_ACTION" && "ไม่สามารถทำรายการได้ (บัตรอยู่นอกงาน)"}
              {scanResult.result === "WRONG_EVENT" && "บัตรของงานแสดงอื่น (WRONG EVENT)"}
              {scanResult.result === "UNPAID" && "ยังไม่ได้รับการชำระเงิน (UNPAID)"}
              {scanResult.result === "CANCELLED" && "บัตรถูกยกเลิก (CANCELLED)"}
              {scanResult.result === "INVALID" && "ไม่พบบัตรในระบบ / รหัสไม่ถูกต้อง (INVALID)"}
              {scanResult.result === "SCAN_UNCONFIRMED" && "ไม่สามารถยืนยันผลการสแกนได้ (UNCONFIRMED)"}
              {scanResult.result === "ERROR" && "เกิดข้อผิดพลาดในการตรวจสอบ"}
            </h2>

            {/* Additional details (Ticket number & Status) */}
            {scanResult.ticket && (
              <div className="pt-2 text-sm text-neutral-300 font-mono">
                เลขที่บัตร: <strong className="text-white text-base">{scanResult.ticket.ticketNumber}</strong>
                <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold border border-neutral-700 bg-neutral-900">
                  {scanResult.ticket.status}
                </span>
              </div>
            )}

            {scanResult.errorMessage && (
              <p className="text-xs text-neutral-300 pt-1">{scanResult.errorMessage}</p>
            )}
          </div>

          {/* Acknowledgment Action Button (AC-23) */}
          <div className="pt-2">
            <button
              id="next-scan-btn"
              type="button"
              onClick={handleAcknowledgeNext}
              autoFocus
              className="inline-flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-extrabold text-sm sm:text-base rounded-xl hover:bg-neutral-200 transition-all shadow-lg active:scale-98 cursor-pointer"
            >
              <span>สแกนคนถัดไป</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {/* 4. Recent Scan Audit Table (AC-18) */}
      <section className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden space-y-0">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            ประวัติการสแกนล่าสุด (Scan Audit Trail)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
            {recentScans.length} รายการ
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-neutral-900 text-xs font-sans">
          {recentScans.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-mono">
              ยังไม่มีประวัติการสแกนสำหรับงานนี้
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900/40 text-[10px] text-neutral-500 uppercase font-mono">
                  <th className="p-3">เวลา</th>
                  <th className="p-3">เลขที่บัตร</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">ผลลัพธ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-mono text-xs">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-neutral-900/30 transition-colors">
                    <td className="p-3 text-neutral-400 whitespace-nowrap">
                      {new Date(scan.scannedAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-white font-bold">
                      {scan.ticketNumber || <span className="text-neutral-600">-</span>}
                    </td>
                    <td className="p-3 text-neutral-300">
                      {scan.action}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          scan.result === "VALID"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : scan.result === "ALREADY_CHECKED_IN" || scan.result === "INVALID_ACTION"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-red-950 text-red-400 border border-red-800"
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
    </div>
  );
}
