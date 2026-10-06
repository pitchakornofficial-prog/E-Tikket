"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { ClipboardCheckIcon, MusicIcon } from "./icons";

export function AdminNav() {
  const pathname = usePathname();

  const isVerifications = pathname.startsWith("/admin/verifications");
  const isEvents = pathname.startsWith("/admin/events");

  return (
    <header className="border-b border-neutral-900 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 text-white font-bold tracking-wider text-base uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-black font-mono font-bold">ADMIN</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs">
            <Link
              href="/admin/verifications"
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                isVerifications
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <ClipboardCheckIcon className="w-3.5 h-3.5" />
              <span>ตรวจสอบการชำระเงิน</span>
            </Link>
            <Link
              href="/admin/events"
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                isEvents
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <MusicIcon className="w-3.5 h-3.5" />
              <span>จัดการคอนเสิร์ต</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
