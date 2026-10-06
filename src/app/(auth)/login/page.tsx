"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 text-sm font-medium border border-red-500/50 bg-red-950/30 text-red-200 rounded"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-200"
        >
          อีเมล
        </label>
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
          className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-white focus:border-white disabled:opacity-50 text-sm transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-200"
        >
          รหัสผ่าน
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded focus:outline-none focus:ring-2 focus:ring-white focus:border-white disabled:opacity-50 text-sm transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-[44px] py-2.5 px-4 bg-white text-black font-semibold rounded hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-colors text-sm"
      >
        {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
            E-Tikket Staff
          </h1>
          <p className="text-xs text-neutral-400">
            เข้าสู่ระบบสำหรับผู้ดูแลระบบและผู้จัดงาน
          </p>
        </header>

        <div className="p-6 border border-neutral-800 bg-neutral-950 rounded-lg shadow-2xl">
          <Suspense
            fallback={
              <div className="text-center py-8 text-neutral-400 text-sm">
                กำลังโหลด...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <footer className="text-center text-xs text-neutral-600">
          E-Tikket Ticketing Platform
        </footer>
      </div>
    </main>
  );
}
