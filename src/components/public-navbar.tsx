"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicNavbar() {
  const pathname = usePathname();

  const isExplore = pathname === "/";
  const isMyTickets = pathname.startsWith("/my-tickets");

  return (
    <header className="border-b border-neutral-900 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-bold tracking-wider text-lg uppercase"
        >
          <span>TICKETBOX</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
            MVP
          </span>
        </Link>
        <nav className="flex items-center justify-center gap-5 sm:gap-6 text-sm w-full sm:w-auto pt-2 sm:pt-0 border-t border-neutral-900 sm:border-t-0">
          <Link
            href="/"
            className={`transition-colors ${
              isExplore
                ? "text-white font-medium"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            สำรวจงานแสดง
          </Link>
          <Link
            href="/news"
            className={`transition-colors ${
              pathname.startsWith("/news")
                ? "text-white font-medium"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            ข่าวสาร
          </Link>
          <Link
            href="/my-tickets"
            className={`transition-colors ${
              isMyTickets
                ? "text-white font-medium"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            ตั๋วของฉัน
          </Link>
        </nav>
      </div>
    </header>
  );
}
