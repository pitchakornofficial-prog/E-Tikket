"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { CameraIcon, FileTextIcon } from "./icons";

export function OrganizerNav() {
  const pathname = usePathname();

  const isScanner = pathname === "/organizer" || pathname.startsWith("/organizer/scanner");
  const isArticles = pathname.startsWith("/organizer/articles");

  return (
    <header className="border-b border-neutral-900 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/organizer" className="flex items-center gap-2 text-white font-bold tracking-wider text-base uppercase">
            <span>TICKETBOX</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400 text-black font-mono font-bold">ORGANIZER</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs">
            <Link
              href="/organizer"
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                isScanner
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span>สแกนเนอร์หน้างาน</span>
            </Link>
            <Link
              href="/organizer/articles"
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                isArticles
                  ? "bg-neutral-800 text-white font-bold"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>จัดการบทความ</span>
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
