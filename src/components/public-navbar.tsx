"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function PublicNavbar() {
  const pathname = usePathname();

  const isExplore = pathname === "/";
  const isMyTickets = pathname.startsWith("/my-tickets");

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-900 bg-white/90 dark:bg-neutral-950/90 backdrop-blur sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-black dark:text-white font-bold tracking-wider text-lg uppercase"
        >
          <span>TICKETBOX</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-mono">
            MVP
          </span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t border-neutral-200 dark:border-neutral-900 sm:border-t-0">
          <nav className="flex items-center justify-center gap-5 sm:gap-6 text-sm">
            <Link
              href="/"
              className={`transition-colors ${
                isExplore
                  ? "text-black dark:text-white font-semibold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              สำรวจงานแสดง
            </Link>
            <Link
              href="/news"
              className={`transition-colors ${
                pathname.startsWith("/news")
                  ? "text-black dark:text-white font-semibold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              ข่าวสาร
            </Link>
            <Link
              href="/my-tickets"
              className={`transition-colors ${
                isMyTickets
                  ? "text-black dark:text-white font-semibold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              ตั๋วของฉัน
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
