"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PublicNavbarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export function PublicNavbar({ searchQuery = "", onSearchChange }: PublicNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Left: Logo */}
        <Link href="/" className="brand">
          <span className="brand-text">E-TIKKET</span>
          <span className="brand-dot"></span>
        </Link>

        {/* Center: Instant Search Bar */}
        <div className="search-wrapper">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="live-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="ค้นหาชื่องาน, ศิลปิน, สถานที่..."
            className="search-input"
          />
        </div>

        {/* Right: Navigation Links */}
        <nav className="nav-actions">
          <Link
            href="/my-tickets"
            className={`nav-link ${pathname.startsWith("/my-tickets") ? "active" : ""}`}
            data-prototype-target="lookup-v1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>ค้นหาบัตร</span>
          </Link>
          <Link
            href="/news"
            className={`nav-link ${pathname.startsWith("/news") ? "active" : ""}`}
            data-prototype-target="news-v1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
              <path d="M18 14h-8"></path>
              <path d="M15 18h-5"></path>
              <path d="M10 6h8v4h-8V6Z"></path>
            </svg>
            <span>ข่าวสาร</span>
          </Link>
          <Link
            href="/login"
            className="nav-link"
            title="สำหรับผู้จัดงาน / แอดมิน"
          >
            <span>ผู้จัดงาน</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
