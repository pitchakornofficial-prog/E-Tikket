"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  TicketIcon,
} from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 429) {
          setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else {
          const data = await response.json().catch(() => ({}));
          setError(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const role = data.user?.role;

      // Safe redirect destination
      if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
        const decoded = decodeURIComponent(callbackUrl);
        // Ensure organizers are not redirected into admin area via callbackUrl
        if (role === "ORGANIZER" && decoded.startsWith("/admin")) {
          router.push("/organizer");
        } else {
          router.push(decoded);
        }
      } else if (role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/organizer");
      }
    } catch {
      setError("ระบบไม่สามารถให้บริการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1-Click Demo Accounts Quick-Select */}
      <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]"></span>
            เข้าสู่ระบบด่วน (Demo Accounts)
          </span>
          <span className="text-[10px] text-neutral-400">คลิกเพื่อกรอก</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail("admin@example.com");
              setPassword("12345678");
              setError(null);
            }}
            className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col gap-1 cursor-pointer ${
              email === "admin@example.com"
                ? "border-[#ccff00] bg-[#ccff00]/10 text-neutral-900 dark:text-white font-medium shadow-sm"
                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ccff00]"></span>
                Admin
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                ผู้ดูแลระบบ
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
              admin@example.com
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("organizer@example.com");
              setPassword("12345678");
              setError(null);
            }}
            className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col gap-1 cursor-pointer ${
              email === "organizer@example.com"
                ? "border-[#ccff00] bg-[#ccff00]/10 text-neutral-900 dark:text-white font-medium shadow-sm"
                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                Organizer
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                ผู้จัดงาน
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
              organizer@example.com
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2.5 animate-fadeIn"
          >
            <AlertTriangleIcon className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
          >
            อีเมลเจ้าหน้าที่
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              disabled={isLoading}
              className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl text-sm focus:outline-none focus:border-black dark:focus:border-white focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              รหัสผ่าน
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl text-sm focus:outline-none focus:border-black dark:focus:border-white focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-lime btn-lg full-width font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
          style={{ borderRadius: "var(--radius-pill)" }}
        >
          {isLoading ? (
            <>
              <RefreshCwIcon className="w-4 h-4 animate-spin" />
              <span>กำลังเข้าสู่ระบบ...</span>
            </>
          ) : (
            <>
              <span>เข้าสู่ระบบทันที</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Guest Checkout Notice */}
      <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">
          สำหรับผู้ชมงาน: ไม่จำเป็นต้องมีบัญชีเพื่อซื้อบัตร คุณสามารถซื้อและค้นหาตั๋วได้ทันทีด้วยอีเมล
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <Link
            href="/my-tickets"
            className="inline-flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-[#ccff00] hover:underline underline-offset-4 transition-colors"
          >
            <TicketIcon className="w-3.5 h-3.5" />
            <span>ค้นหาบัตรของฉัน</span>
          </Link>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <span>หน้าแรกคอนเสิร์ต</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between px-4 py-8 relative font-sans">
      {/* Top Header Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors group"
        >
          <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>กลับสู่หน้าแรก</span>
        </Link>
      </header>

      {/* Centered Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="p-7 sm:p-9 bg-white border border-neutral-200 rounded-[28px] shadow-xl relative overflow-hidden">
          {/* Subtle Glow Backdrop */}
          <div
            className="absolute -top-24 -right-24 w-48 h-48 bg-[#ccff00]/15 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="flex flex-col items-center mb-6 text-center relative z-10">
            <Link href="/" className="brand mb-3">
              <span className="brand-text" style={{ fontSize: "26px", fontWeight: 800 }}>E-TIKKET</span>
              <span className="brand-dot" style={{ width: "9px", height: "9px" }}></span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#ccff00]/20 text-neutral-950 border border-[#ccff00]/40 mb-2">
              PORTAL เจ้าหน้าที่
            </span>
            <h1
              className="text-2xl font-black tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              เข้าสู่ระบบจัดการงาน
            </h1>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              ระบบสำหรับผู้ดูแลระบบ (Admin) ตรวจสอบสลิป และผู้จัดงาน (Organizer) ควบคุมประตู
            </p>
          </div>

          <div className="relative z-10">
            <Suspense
              fallback={
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  <span>กำลังโหลดข้อมูลระบบ...</span>
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <footer className="text-center text-[11px] text-neutral-400 dark:text-neutral-600 mt-6">
          E-TIKKET PLATFORM • SECURE STAFF ACCESS
        </footer>
      </div>

      <div className="h-4"></div>
    </main>
  );
}
