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
  FlashlightIcon,
  FlashlightOffIcon,
  VolumeIcon,
  VolumeXIcon,
  ZapIcon,
} from "@/components/icons";
import {
  playBeep,
  triggerHaptic,
  checkTorchCapability,
  setTorchEnabled,
} from "@/lib/scanner-feedback";

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
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Sensory feedback states
  const [isMuted, setIsMuted] = useState(false);

  // Network connectivity status
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const savedMute = localStorage.getItem("etikket_scanner_muted");
      if (savedMute === "true") {
        setIsMuted(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("etikket_scanner_muted", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Continuous Auto-Scan (Fast Mode) states
  const [isContinuousScan, setIsContinuousScan] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  useEffect(() => {
    try {
      const savedContinuous = localStorage.getItem("etikket_continuous_scan");
      if (savedContinuous !== null) {
        setIsContinuousScan(savedContinuous === "true");
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleContinuousScan = () => {
    setIsContinuousScan((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("etikket_continuous_scan", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

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

    setIsTorchOn(false);
    setTorchAvailable(false);

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
      setTorchAvailable(checkTorchCapability(stream));
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

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchAvailable) return;
    const nextState = !isTorchOn;
    const success = await setTorchEnabled(streamRef.current, nextState);
    if (success) {
      setIsTorchOn(nextState);
    }
  }, [torchAvailable, isTorchOn]);

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

          if (data.result === "VALID") {
            playBeep("success", isMuted);
            triggerHaptic("success");
          } else {
            playBeep("warning", isMuted);
            triggerHaptic("warning");
          }
        } else {
          playBeep("error", isMuted);
          triggerHaptic("error");

          setScanResult({
            result: data.error?.code === "SCAN_UNCONFIRMED" ? "SCAN_UNCONFIRMED" : "ERROR",
            action,
            eventId: selectedEventId,
            errorMessage: data.error?.message || "การส่งคำขอสแกนล้มเหลว",
          });
        }
      } catch {
        playBeep("error", isMuted);
        triggerHaptic("error");

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
    [selectedEventId, action, loadRecentScans, isMuted],
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
  const handleAcknowledgeNext = useCallback(() => {
    setScanResult(null);
    setIsSubmitting(false);
    setAutoNextCountdown(null);
    isAwaitingAcknowledgmentRef.current = false;
  }, []);

  // Auto-advance timer in Continuous Mode
  useEffect(() => {
    if (!scanResult || !isContinuousScan) {
      setAutoNextCountdown(null);
      return;
    }

    const duration = scanResult.result === "VALID" ? 1500 : 2500;
    const startTime = Date.now();
    setAutoNextCountdown(100);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      setAutoNextCountdown(remainingPercent);

      if (elapsed >= duration) {
        clearInterval(interval);
        handleAcknowledgeNext();
      }
    }, 40);

    return () => {
      clearInterval(interval);
    };
  }, [scanResult, isContinuousScan, handleAcknowledgeNext]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const scanControlsDisabled = isSubmitting || scanResult !== null;

  return (
    <div className="space-y-6 max-w-xl mx-auto w-full">
      {/* Network Online / Offline Status Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white rounded-xl p-3.5 flex items-start gap-3 shadow-lg border border-red-700 animate-pulse">
          <AlertTriangleIcon className="w-5 h-5 shrink-0 mt-0.5 text-white" />
          <div className="space-y-0.5 text-xs">
            <p className="font-bold">อุปกรณ์ขาดการเชื่อมต่ออินเทอร์เน็ต (Offline)</p>
            <p className="text-red-100 leading-relaxed">
              การสแกนบัตรไม่สามารถส่งข้อมูลยืนยันไปยังฐานข้อมูลได้จนกว่าจะเชื่อมต่อสำเร็จ กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi หรือเครือข่ายมือถือ
            </p>
          </div>
        </div>
      )}

      {/* 1. Event & Action Selector Card */}
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
        {/* Header with Network Indicator */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-900">
          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">สถานะเครือข่าย</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors ${
              isOnline
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 animate-pulse"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span>{isOnline ? "ออนไลน์ (Online)" : "ขาดการเชื่อมต่อ (Offline)"}</span>
          </span>
        </div>

        {loadingEvents ? (
          <div className="text-center py-4 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            กำลังโหลดรายชื่องานแสดง...
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center gap-2 text-center py-4 text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900 rounded p-3">
            <AlertTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <span>ยังไม่มีงานแสดงที่คุณเป็นผู้จัด กรุณาสร้างงานแสดงก่อนเริ่มใช้งานระบบสแกน</span>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="event-select" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                เลือกงานแสดง (Selected Event):
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                }}
                disabled={scanControlsDisabled}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm rounded-lg p-3 font-semibold focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.eventDate} @ {ev.venue})
                  </option>
                ))}
              </select>
            </div>

            {/* Continuous Auto-Scan (Fast Mode) Toggle */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isContinuousScan
                      ? "bg-amber-400 text-black shadow-sm"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
                  }`}
                >
                  <ZapIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span>สแกนต่อเนื่องอัตโนมัติ (Fast Mode)</span>
                    {isContinuousScan && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
                        ON
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {isContinuousScan
                      ? "รีเซ็ตกล้องรับบัตรถัดไปอัตโนมัติ (ผ่าน 1.5s / แจ้งเตือน 2.5s)"
                      : "ต้องกดปุ่ม 'สแกนคนถัดไป' ด้วยตนเองทุกครั้ง"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleContinuousScan}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isContinuousScan ? "bg-neutral-900 dark:bg-white" : "bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
                }`}
                role="switch"
                aria-checked={isContinuousScan}
                title={isContinuousScan ? "ปิดโหมดสแกนต่อเนื่อง" : "เปิดโหมดสแกนต่อเนื่อง"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow ring-0 transition duration-200 ease-in-out ${
                    isContinuousScan ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="action-select" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
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
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
                      : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white"
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
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
                      : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white"
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
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden relative shadow-lg dark:shadow-2xl">
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

          {/* Quick Toolbar Overlay on Viewfinder */}
          {cameraState === "ACTIVE" && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "เปิดเสียงแจ้งเตือน" : "ปิดเสียงแจ้งเตือน"}
                title={isMuted ? "เปิดเสียงแจ้งเตือน" : "ปิดเสียงแจ้งเตือน"}
                className={`p-2 rounded-full backdrop-blur shadow-md transition-colors ${
                  isMuted
                    ? "bg-black/60 text-neutral-400 border border-white/20 hover:bg-black/80"
                    : "bg-emerald-500 text-white shadow-emerald-500/30"
                }`}
              >
                {isMuted ? <VolumeXIcon className="w-3.5 h-3.5" /> : <VolumeIcon className="w-3.5 h-3.5" />}
              </button>

              {torchAvailable && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-label={isTorchOn ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
                  title={isTorchOn ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur transition-all ${
                    isTorchOn
                      ? "bg-amber-400 text-black shadow-amber-400/40 ring-2 ring-amber-300"
                      : "bg-black/60 text-white border border-white/20 hover:bg-black/80"
                  }`}
                >
                  {isTorchOn ? <FlashlightOffIcon className="w-3.5 h-3.5" /> : <FlashlightIcon className="w-3.5 h-3.5" />}
                  <span>{isTorchOn ? "ไฟฉาย: เปิด" : "ไฟฉาย"}</span>
                </button>
              )}
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-black font-bold text-xs rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold text-xs rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
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
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-200 dark:border-neutral-900 flex justify-between items-center text-xs">
          <span className="text-neutral-600 dark:text-neutral-400 font-mono">
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
          className={`p-6 rounded-xl border text-center space-y-4 shadow-xl dark:shadow-2xl transition-all ${
            scanResult.result === "VALID"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200"
              : scanResult.result === "ALREADY_CHECKED_IN" || scanResult.result === "INVALID_ACTION"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500 text-amber-950 dark:text-amber-200"
                : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500 text-red-950 dark:text-red-200"
          }`}
        >
          {/* Result Icon */}
          <div className="flex justify-center">
            {scanResult.result === "VALID" &&
              (scanResult.action === "CHECK_IN" ? (
                <CheckCircleIcon className="w-16 h-16 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <WalkIcon className="w-16 h-16 text-emerald-500 dark:text-emerald-400" />
              ))}
            {(scanResult.result === "ALREADY_CHECKED_IN" || scanResult.result === "INVALID_ACTION") && (
              <AlertTriangleIcon className="w-16 h-16 text-amber-500 dark:text-amber-400" />
            )}
            {(scanResult.result === "WRONG_EVENT" || scanResult.result === "UNPAID" || scanResult.result === "INVALID") && (
              <XCircleIcon className="w-16 h-16 text-red-500 dark:text-red-400" />
            )}
            {scanResult.result === "CANCELLED" && (
              <BanIcon className="w-16 h-16 text-red-500 dark:text-red-400" />
            )}
            {(scanResult.result === "SCAN_UNCONFIRMED" || scanResult.result === "ERROR") && (
              <AlertCircleIcon className="w-16 h-16 text-amber-500 dark:text-amber-400" />
            )}
          </div>

          {/* Result Title */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
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
              <div className="pt-2 text-sm text-neutral-700 dark:text-neutral-300 font-mono">
                เลขที่บัตร: <strong className="text-neutral-900 dark:text-white text-base">{scanResult.ticket.ticketNumber}</strong>
                <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                  {scanResult.ticket.status}
                </span>
              </div>
            )}

            {scanResult.errorMessage && (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 pt-1">{scanResult.errorMessage}</p>
            )}
          </div>

            {/* Fast Mode Countdown Bar */}
            {isContinuousScan && autoNextCountdown !== null && (
              <div className="space-y-1.5 pt-2 text-left">
                <div className="flex justify-between items-center text-[11px] font-mono font-bold text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <ZapIcon className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span>กำลังรีเซ็ตกล้องอัตโนมัติ (Fast Mode)...</span>
                  </span>
                  <span>{((scanResult.result === "VALID" ? 1.5 : 2.5) * (autoNextCountdown / 100)).toFixed(1)}s</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white transition-all duration-75 rounded-full"
                    style={{ width: `${autoNextCountdown}%` }}
                  />
                </div>
              </div>
            )}

            {/* Acknowledgment Action Button (AC-23) */}
            <div className="pt-2">
              <button
                id="next-scan-btn"
                type="button"
                onClick={handleAcknowledgeNext}
                autoFocus
                className="inline-flex items-center justify-center gap-2 w-full py-4 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-extrabold text-sm sm:text-base rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <span>{isContinuousScan ? "สแกนคนถัดไปทันที (ข้ามเวลารอ)" : "สแกนคนถัดไป"}</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
        </section>
      )}

      {/* 4. Recent Scan Audit Table (AC-18) */}
      <section className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden space-y-0 shadow-sm dark:shadow-none">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300">
            ประวัติการสแกนล่าสุด (Scan Audit Trail)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
            {recentScans.length} รายการ
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900 text-xs font-sans">
          {recentScans.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-mono">
              ยังไม่มีประวัติการสแกนสำหรับงานนี้
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/40 text-[10px] text-neutral-500 uppercase font-mono">
                  <th className="p-3">เวลา</th>
                  <th className="p-3">เลขที่บัตร</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">ผลลัพธ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 font-mono text-xs">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {new Date(scan.scannedAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-neutral-900 dark:text-white font-bold">
                      {scan.ticketNumber || <span className="text-neutral-400 dark:text-neutral-600">-</span>}
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">
                      {scan.action}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          scan.result === "VALID"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                            : scan.result === "ALREADY_CHECKED_IN" || scan.result === "INVALID_ACTION"
                              ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                              : "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
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
