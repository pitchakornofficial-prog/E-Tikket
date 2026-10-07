"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { CameraIcon, FileTextIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

export function OrganizerNav() {
  const pathname = usePathname();

  const isScanner = pathname === "/organizer" || pathname.startsWith("/organizer/scanner");
  const isArticles = pathname.startsWith("/organizer/articles");

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-900 bg-white/90 dark:bg-neutral-950/90 backdrop-blur sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-0">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Link href="/organizer" className="flex items-center gap-2 text-black dark:text-white font-bold tracking-wider text-base uppercase">
              <span>TICKETBOX</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white dark:text-black font-mono font-bold">ORGANIZER</span>
            </Link>
            <div className="sm:hidden flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>

          <nav className="flex items-center justify-start sm:justify-center overflow-x-auto max-w-full gap-1 sm:gap-2 text-xs w-full sm:w-auto pt-2 sm:pt-0 border-t border-neutral-200 dark:border-neutral-900 sm:border-t-0 pb-1 sm:pb-0">
            <Link
              href="/organizer"
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isScanner
                  ? "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span>สแกนเนอร์หน้างาน</span>
            </Link>
            <Link
              href="/organizer/articles"
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isArticles
                  ? "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>จัดการบทความ</span>
            </Link>
          </nav>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
