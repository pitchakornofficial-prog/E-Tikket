"use client";

import { useEffect, useRef, useState, useCallback, use } from "react";
import jsQR from "jsqr";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CameraIcon,
  BanIcon,
  CheckCircleIcon,
  WalkIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  PauseIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  FlashlightIcon,
  FlashlightOffIcon,
  VolumeIcon,
  VolumeXIcon,
  ZapIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  RefreshCwIcon,
  TicketIcon,
} from "@/components/icons";
import {
  playBeep,
  triggerHaptic,
  checkTorchCapability,
  setTorchEnabled,
} from "@/lib/scanner-feedback";

interface RouteProps {
  params: Promise<{ token: string }>;
}

interface CheckerInfo {
  id: string;
  name: string;
  gateNote: string | null;
}

interface EventInfo {
  id: string;
  name: string;
  eventDate: string;
  startTime: string;
  venue: string;
  category: string;
  status: string;
}

interface ScanRecord {
  id: string;
  action: "CHECK_IN" | "CHECK_OUT";
  result: string;
  scannedAt: string;
  ticketNumber: string | null;
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

interface ManualTicketItem {
  id: string;
  ticketNumber: string;
  status: "OUTSIDE" | "INSIDE" | "CANCELLED";
  customerName: string;
  customerPhone: string;
  orderStatus: string;
}

export default function MobileGateScannerPage({ params }: RouteProps) {
  const { token } = use(params);

  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [checker, setChecker] = useState<CheckerInfo | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);

  const [action, setAction] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");
  const [sessionScans, setSessionScans] = useState<ScanRecord[]>([]);

  // Manual search states
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualSearchResults, setManualSearchResults] = useState<ManualTicketItem[]>([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualActionLoadingNumber, setManualActionLoadingNumber] = useState<string | null>(null);

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
      // Ignore local storage error
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

  // Scan gating states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRequestIdRef = useRef(0);
  const isAwaitingAcknowledgmentRef = useRef<boolean>(false);

  useEffect(() => {
    isAwaitingAcknowledgmentRef.current = scanResult !== null || isSubmitting;
  }, [scanResult, isSubmitting]);

  // 1. Validate Token on mount
  const validateToken = useCallback(async () => {
    setLoadingToken(true);
    setTokenError(null);
    try {
      const res = await fetch(`/api/scanner/${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        setTokenError(data.error?.message || "ลิงก์สแกนเนอร์ไม่ถูกต้องหรือถูกยกเลิกแล้ว");
        setLoadingToken(false);
        return;
      }

      setChecker(data.checker);
      setEvent(data.event);
      setLoadingToken(false);
    } catch {
      setTokenError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบสิทธิ์ได้");
      setLoadingToken(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // 2. Camera Controls
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

  const startCamera = useCallback(async () => {
    releaseCamera();
    const requestId = cameraRequestIdRef.current;
    setCameraState("REQUESTING");
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("UNAVAILABLE");
      setCameraError("เบราว์เซอร์หรืออุปกรณ์ไม่รองรับการเปิดกล้อง (ต้องใช้งานผ่าน HTTPS หรือ localhost)");
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
      if (requestId !== cameraRequestIdRef.current) return;

      const errorObj = err as Error;
      if (errorObj.name === "NotAllowedError" || errorObj.name === "PermissionDeniedError") {
        setCameraState("DENIED");
        setCameraError("คุณปฏิเสธการให้สิทธิ์เข้าถึงกล้อง กรุณากดอนุญาตในการตั้งค่าของเบราว์เซอร์");
      } else {
        setCameraState("UNAVAILABLE");
        setCameraError(errorObj.message || "ไม่สามารถเชื่อมต่ออุปกรณ์กล้องได้");
      }
    }
  }, [releaseCamera]);

  useEffect(() => {
    if (checker && event) {
      void startCamera();
    }
    return () => {
      releaseCamera();
    };
  }, [checker, event, startCamera, releaseCamera]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchAvailable) return;
    const nextState = !isTorchOn;
    const success = await setTorchEnabled(streamRef.current, nextState);
    if (success) {
      setIsTorchOn(nextState);
    }
  }, [torchAvailable, isTorchOn]);

  // 3. Scan QR submission
  const handleScanDetected = useCallback(
    async (decodedToken: string) => {
      if (isAwaitingAcknowledgmentRef.current || !checker || !event) {
        return;
      }

      isAwaitingAcknowledgmentRef.current = true;
      setIsSubmitting(true);

      try {
        const res = await fetch(`/api/scanner/${encodeURIComponent(token)}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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

          // Add to local session log
          setSessionScans((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              action: data.action,
              result: data.result,
              scannedAt: data.scannedAt || new Date().toISOString(),
              ticketNumber: data.ticket?.ticketNumber || null,
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          playBeep("error", isMuted);
          triggerHaptic("error");

          setScanResult({
            result: data.error?.code === "SCAN_UNCONFIRMED" ? "SCAN_UNCONFIRMED" : "ERROR",
            action,
            eventId: event.id,
            errorMessage: data.error?.message || "การตรวจสอบบัตรล้มเหลว",
          });
        }
      } catch {
        playBeep("error", isMuted);
        triggerHaptic("error");

        setScanResult({
          result: "SCAN_UNCONFIRMED",
          action,
          eventId: event.id,
          errorMessage: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ต",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [checker, event, token, action, isMuted],
  );

  // Manual ticket search & check-in handlers
  const searchTickets = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setManualSearchResults([]);
        return;
      }
      setManualSearching(true);
      try {
        const res = await fetch(
          `/api/scanner/${encodeURIComponent(token)}/search?q=${encodeURIComponent(q.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setManualSearchResults(data.tickets || []);
        } else {
          setManualSearchResults([]);
        }
      } catch {
        setManualSearchResults([]);
      } finally {
        setManualSearching(false);
      }
    },
    [token],
  );

  const handleManualCheckin = useCallback(
    async (ticketNumber: string, targetAction: "CHECK_IN" | "CHECK_OUT") => {
      if (manualActionLoadingNumber || !checker || !event) return;
      setManualActionLoadingNumber(ticketNumber);

      try {
        const res = await fetch(`/api/scanner/${encodeURIComponent(token)}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketNumber,
            action: targetAction,
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
            // Update in manual search results list
            setManualSearchResults((prev) =>
              prev.map((item) =>
                item.ticketNumber === ticketNumber
                  ? {
                      ...item,
                      status: targetAction === "CHECK_IN" ? "INSIDE" : "OUTSIDE",
                    }
                  : item,
              ),
            );
          } else {
            playBeep("warning", isMuted);
            triggerHaptic("warning");
          }

          setSessionScans((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              action: data.action,
              result: data.result,
              scannedAt: data.scannedAt || new Date().toISOString(),
              ticketNumber: data.ticket?.ticketNumber || ticketNumber,
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          playBeep("error", isMuted);
          triggerHaptic("error");

          setScanResult({
            result: data.error?.code === "SCAN_UNCONFIRMED" ? "SCAN_UNCONFIRMED" : "ERROR",
            action: targetAction,
            eventId: event.id,
            errorMessage: data.error?.message || "การตรวจสอบบัตรล้มเหลว",
          });
        }
      } catch {
        playBeep("error", isMuted);
        triggerHaptic("error");

        setScanResult({
          result: "SCAN_UNCONFIRMED",
          action: targetAction,
          eventId: event.id,
          errorMessage: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ต",
        });
      } finally {
        setManualActionLoadingNumber(null);
      }
    },
    [checker, event, isMuted, manualActionLoadingNumber, token],
  );

  // 4. Processing loop
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

  // Acknowledge Next
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

  const scanControlsDisabled = isSubmitting || scanResult !== null;

  // 1. Loading State
  if (loadingToken) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono text-neutral-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งานกล้องสแกนเนอร์...</p>
      </div>
    );
  }

  // 2. Token Error State
  if (tokenError || !checker || !event) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-950 border border-red-300 dark:border-red-900/60 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <BanIcon className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-neutral-900 dark:text-white">
            ไม่สามารถเข้าใช้งานได้
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {tokenError || "ลิงก์สแกนเนอร์นี้ไม่ถูกต้อง หมดอายุ หรือถูกยกเลิกการเข้าถึงแล้ว กรุณาติดต่อผู้จัดงานเพื่อขอรับลิงก์ใหม่"}
          </p>
          <button
            onClick={validateToken}
            className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-lg text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200"
          >
            ลองเชื่อมต่อใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // 3. Main Scanner Interface
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white font-sans flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-900 bg-white/90 dark:bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-wider uppercase">TICKETBOX</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-white dark:bg-white dark:text-black">
              GATE STAFF
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Network Online / Offline Status Badge */}
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
              <span>{isOnline ? "ออนไลน์" : "ขาดการเชื่อมต่อ"}</span>
            </span>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "เปิดเสียงแจ้งเตือน" : "ปิดเสียงแจ้งเตือน"}
              title={isMuted ? "เปิดเสียงแจ้งเตือน" : "ปิดเสียงแจ้งเตือน"}
              className={`p-2 rounded-lg border transition-colors ${
                isMuted
                  ? "bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-400"
                  : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              }`}
            >
              {isMuted ? <VolumeXIcon className="w-4 h-4" /> : <VolumeIcon className="w-4 h-4" />}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-4 py-5 w-full space-y-5">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-red-600 text-white rounded-xl p-3.5 flex items-start gap-3 shadow-lg border border-red-700 animate-pulse">
            <AlertTriangleIcon className="w-5 h-5 shrink-0 mt-0.5 text-white" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold">อุปกรณ์ขาดการเชื่อมต่ออินเทอร์เน็ต (Offline)</p>
              <p className="text-red-100 leading-relaxed">
                การสแกนหรือค้นหาบัตรจะไม่สามารถส่งข้อมูลไปยังระบบได้จนกว่าสัญญาณจะกลับมา กรุณาตรวจสอบ Wi-Fi หรือ Cellular
              </p>
            </div>
          </div>
        )}

        {/* Event & Staff Info Card */}
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3 shadow-sm">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-neutral-400">งานแสดง:</span>
            <h1 className="text-lg font-black text-neutral-900 dark:text-white line-clamp-1">{event.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 mt-1">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{event.eventDate} @ {event.startTime} น.</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-3 h-3" />
                <span className="line-clamp-1">{event.venue}</span>
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-neutral-100 dark:bg-neutral-900 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
              <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>เจ้าหน้าที่: {checker.name}</span>
            </div>
            {checker.gateNote && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold">
                {checker.gateNote}
              </span>
            )}
          </div>
        </div>

        {/* Continuous Auto-Scan (Fast Mode) Toggle */}
        <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                isContinuousScan
                  ? "bg-amber-400 text-black shadow-sm"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400"
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

        {/* Scan Action Mode Toggle */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setAction("CHECK_IN")}
            disabled={scanControlsDisabled}
            className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              action === "CHECK_IN"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md"
                : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <span>↘ เข้างาน</span>
            <span className="font-mono text-[10px]">(CHECK_IN)</span>
          </button>

          <button
            type="button"
            onClick={() => setAction("CHECK_OUT")}
            disabled={scanControlsDisabled}
            className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              action === "CHECK_OUT"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md"
                : "bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <span>↗ ออกชั่วคราว</span>
            <span className="font-mono text-[10px]">(CHECK_OUT)</span>
          </button>
        </div>

        {/* Viewfinder Container */}
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden relative shadow-lg">
          <div className="relative aspect-video sm:aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraState === "ACTIVE" ? "block" : "hidden"}`}
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlays */}
            {cameraState === "ACTIVE" && (
              <>
                {/* Viewfinder Target Box */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 sm:w-64 sm:h-64 border-2 border-dashed border-white/60 rounded-2xl relative">
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white rounded-br" />

                    {!scanResult && !isSubmitting && (
                      <div className="absolute inset-x-2 top-0 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Torch Toggle Overlay */}
                {torchAvailable && (
                  <div className="absolute top-3 right-3 z-20">
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
                  </div>
                )}
              </>
            )}

            {/* Camera States */}
            {cameraState === "REQUESTING" && (
              <div className="text-center p-6 space-y-2">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-neutral-400 font-mono">กำลังเปิดกล้อง...</p>
              </div>
            )}

            {cameraState === "DENIED" && (
              <div className="text-center p-6 space-y-3 max-w-xs">
                <BanIcon className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-xs text-red-400">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-white text-black font-bold text-xs rounded"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            )}

            {cameraState === "UNAVAILABLE" && (
              <div className="text-center p-6 space-y-3 max-w-xs">
                <CameraIcon className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-xs text-amber-400">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-white text-black font-bold text-xs rounded"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            )}

            {/* Submitting Overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-10 backdrop-blur-sm">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-white font-bold font-mono">กำลังตรวจสอบบัตร...</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-200 dark:border-neutral-900 flex justify-between items-center text-xs">
            <span className="text-neutral-500 font-mono text-[11px]">
              {action === "CHECK_IN" ? "โหมด: ตรวจสอบเข้างาน" : "โหมด: ตรวจสอบออกชั่วคราว"}
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

        {/* Manual Ticket Search Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsManualSearchOpen(true);
            setManualSearchQuery("");
            setManualSearchResults([]);
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
        >
          <SearchIcon className="w-3.5 h-3.5 text-neutral-500" />
          <span>ค้นหาตั๋วด้วยตนเอง (Manual Ticket Search)</span>
          <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">เมื่อสแกนไม่ติด</span>
        </button>

        {/* Scan Result Feedback Panel */}
        {scanResult && (
          <section
            role="status"
            className={`p-6 rounded-2xl border text-center space-y-4 shadow-xl transition-all ${
              scanResult.result === "VALID"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200"
                : scanResult.result === "ALREADY_CHECKED_IN" || scanResult.result === "INVALID_ACTION"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500 text-amber-950 dark:text-amber-200"
                  : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500 text-red-950 dark:text-red-200"
            }`}
          >
            <div className="flex justify-center">
              {scanResult.result === "VALID" &&
                (scanResult.action === "CHECK_IN" ? (
                  <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                ) : (
                  <WalkIcon className="w-16 h-16 text-emerald-500" />
                ))}
              {(scanResult.result === "ALREADY_CHECKED_IN" || scanResult.result === "INVALID_ACTION") && (
                <AlertTriangleIcon className="w-16 h-16 text-amber-500" />
              )}
              {(scanResult.result === "WRONG_EVENT" || scanResult.result === "UNPAID" || scanResult.result === "INVALID") && (
                <XCircleIcon className="w-16 h-16 text-red-500" />
              )}
              {scanResult.result === "CANCELLED" && (
                <BanIcon className="w-16 h-16 text-red-500" />
              )}
              {(scanResult.result === "SCAN_UNCONFIRMED" || scanResult.result === "ERROR") && (
                <AlertCircleIcon className="w-16 h-16 text-amber-500" />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                {scanResult.result === "VALID" &&
                  (scanResult.action === "CHECK_IN"
                    ? "ผ่าน • ตรวจสอบสิทธิ์สำเร็จ (VALID)"
                    : "ผ่าน • ออกจากงานชั่วคราว (VALID)")}
                {scanResult.result === "ALREADY_CHECKED_IN" && "บัตรเข้างานไปแล้ว (ALREADY IN)"}
                {scanResult.result === "INVALID_ACTION" && "ไม่สามารถทำรายการได้ (บัตรอยู่นอกงาน)"}
                {scanResult.result === "WRONG_EVENT" && "บัตรของงานแสดงอื่น (WRONG EVENT)"}
                {scanResult.result === "UNPAID" && "ยังไม่ได้รับการชำระเงิน (UNPAID)"}
                {scanResult.result === "CANCELLED" && "บัตรถูกยกเลิก (CANCELLED)"}
                {scanResult.result === "INVALID" && "ไม่พบบัตรในระบบ (INVALID)"}
                {scanResult.result === "SCAN_UNCONFIRMED" && "ไม่สามารถยืนยันผลการสแกนได้"}
                {scanResult.result === "ERROR" && "เกิดข้อผิดพลาดในการตรวจสอบ"}
              </h2>

              {scanResult.ticket && (
                <div className="pt-2 text-sm text-neutral-700 dark:text-neutral-300 font-mono">
                  เลขที่บัตร: <strong className="text-neutral-900 dark:text-white text-base">{scanResult.ticket.ticketNumber}</strong>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
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

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAcknowledgeNext}
                autoFocus
                className="inline-flex items-center justify-center gap-2 w-full py-4 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <span>{isContinuousScan ? "สแกนคนถัดไปทันที (ข้ามเวลารอ)" : "สแกนคนถัดไป"}</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        {/* Local Session Audit */}
        {sessionScans.length > 0 && (
          <section className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden p-4 space-y-2 text-xs">
            <h3 className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[11px]">
              รายการที่คุณเพิ่งสแกนในรอบนี้ ({sessionScans.length} รายการ)
            </h3>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-900 font-mono text-[11px]">
              {sessionScans.slice(0, 5).map((s) => (
                <div key={s.id} className="py-2 flex justify-between items-center">
                  <span>{s.ticketNumber || "-"}</span>
                  <span className="text-neutral-400">{s.action}</span>
                  <span
                    className={`font-bold ${
                      s.result === "VALID" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {s.result}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-900 py-4 text-center text-[11px] text-neutral-400 font-mono">
        E-Tikket Gate Staff Scanner • Mobile Optimized
      </footer>

      {/* Modal: Manual Ticket Search */}
      {isManualSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <SearchIcon className="w-4 h-4" />
                  <span>ค้นหาตั๋วด้วยตนเอง</span>
                </h2>
                <p className="text-xs text-neutral-500">
                  ค้นหาด้วยเลขตั๋ว, ชื่อผู้ซื้อ หรือเบอร์โทรศัพท์
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualSearchOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  searchTickets(manualSearchQuery);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => {
                      setManualSearchQuery(e.target.value);
                      searchTickets(e.target.value);
                    }}
                    placeholder="พิมพ์เลขตั๋ว (TK-...), ชื่อ, หรือเบอร์โทร..."
                    autoFocus
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  {manualSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualSearchQuery("");
                        setManualSearchResults([]);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={manualSearching || !manualSearchQuery.trim()}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold rounded-lg transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                >
                  {manualSearching ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>ค้นหา</span>
                  )}
                </button>
              </form>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
              {manualSearching ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCwIcon className="w-6 h-6 animate-spin mx-auto text-neutral-400" />
                  <p className="text-xs text-neutral-500">กำลังค้นหาตั๋วในระบบ...</p>
                </div>
              ) : manualSearchResults.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <TicketIcon className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                  <p className="text-xs text-neutral-500">
                    {manualSearchQuery.trim()
                      ? "ไม่พบตั๋วที่ตรงกับคำค้นหาในคอนเสิร์ตนี้"
                      : "พิมพ์คำค้นหาเพื่อเริ่มค้นหาตั๋ว"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase">
                    พบ {manualSearchResults.length} รายการ
                  </span>
                  {manualSearchResults.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-neutral-900 dark:text-white">
                            {t.ticketNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.status === "INSIDE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : t.status === "OUTSIDE"
                                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                                : "bg-red-500/10 text-red-600 border border-red-500/20"
                            }`}
                          >
                            {t.status === "INSIDE"
                              ? "อยู่ในงาน (INSIDE)"
                              : t.status === "OUTSIDE"
                              ? "อยู่นอกงาน (OUTSIDE)"
                              : "ยกเลิก"}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-x-2">
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">
                            {t.customerName}
                          </span>
                          {t.customerPhone && (
                            <span className="font-mono text-neutral-400">({t.customerPhone})</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleManualCheckin(t.ticketNumber, "CHECK_IN")}
                          disabled={manualActionLoadingNumber === t.ticketNumber || t.status === "CANCELLED"}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            t.status === "OUTSIDE"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                          } disabled:opacity-50`}
                          title="กดเพื่อบันทึกการเข้างาน"
                        >
                          {manualActionLoadingNumber === t.ticketNumber ? (
                            <RefreshCwIcon className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckIcon className="w-3 h-3" />
                          )}
                          <span>เข้างาน</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleManualCheckin(t.ticketNumber, "CHECK_OUT")}
                          disabled={manualActionLoadingNumber === t.ticketNumber || t.status === "CANCELLED"}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            t.status === "INSIDE"
                              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                              : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                          } disabled:opacity-50`}
                          title="กดเพื่อบันทึกการออกชั่วคราว"
                        >
                          {manualActionLoadingNumber === t.ticketNumber ? (
                            <RefreshCwIcon className="w-3 h-3 animate-spin" />
                          ) : (
                            <WalkIcon className="w-3 h-3" />
                          )}
                          <span>ออกชั่วคราว</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 flex justify-between items-center text-xs">
              <span className="text-[11px] text-neutral-400">
                การกด Check-in/Check-out จะบันทึกประวัติการสแกนทันที
              </span>
              <button
                type="button"
                onClick={() => setIsManualSearchOpen(false)}
                className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg font-bold transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
