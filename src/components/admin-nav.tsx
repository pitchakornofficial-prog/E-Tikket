"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { ClipboardCheckIcon, MusicIcon, FileTextIcon, SlidersIcon } from "./icons";

export function AdminNav() {
  const pathname = usePathname();

  const isVerifications = pathname.startsWith("/admin/verifications");
  const isEvents = pathname.startsWith("/admin/events");
  const isArticles = pathname.startsWith("/admin/articles");
  const isCategories = pathname.startsWith("/admin/categories");

  return (
    <header className="border-b border-neutral-900 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-0">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Link href="/admin" className="flex items-center gap-2 text-white font-bold tracking-wider text-base uppercase">
              <span>TICKETBOX</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-black font-mono font-bold">ADMIN</span>
            </Link>
            <div className="sm:hidden">
              <LogoutButton />
            </div>
          </div>

          <nav className="flex items-center justify-start sm:justify-center overflow-x-auto max-w-full gap-1 sm:gap-2 text-xs w-full sm:w-auto pt-2 sm:pt-0 border-t border-neutral-900 sm:border-t-0 pb-1 sm:pb-0">
            <Link
              href="/admin/verifications"
              className={`px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
              className={`px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isEvents
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <MusicIcon className="w-3.5 h-3.5" />
              <span>จัดการคอนเสิร์ต</span>
            </Link>
            <Link
              href="/admin/articles"
              className={`px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isArticles
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>จัดการบทความ</span>
            </Link>
            <Link
              href="/admin/categories"
              className={`px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isCategories
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <SlidersIcon className="w-3.5 h-3.5" />
              <span>หมวดหมู่บทความ</span>
            </Link>
          </nav>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
