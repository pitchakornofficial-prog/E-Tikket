"use client";

import { useState } from "react";
import { PrototypeControlBar } from "./prototype-control-bar";
import { PublicNavbar } from "./public-navbar";
import { EventCatalogBrowser, CatalogEvent } from "./event-catalog-browser";

interface HomePageClientProps {
  events: CatalogEvent[];
  error?: boolean;
}

export function HomePageClient({ events, error }: HomePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div data-prototype-page="home" data-prototype-id="home-v6">
      {/* 1. Prototype Control Bar */}
      <PrototypeControlBar firstEventId={events[0]?.id} />

      {/* 2. Site Navigation Header with Center Search Bar */}
      <PublicNavbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* 3. Main Content matching docs/assets/prototype/index.html */}
      <main className="main-content">
        {error ? (
          <div className="p-8 border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-2xl text-center space-y-3 shadow-sm">
            <p className="text-red-500 font-semibold text-base">ไม่สามารถโหลดข้อมูลงานแสดงได้ในขณะนี้</p>
            <p className="text-xs text-neutral-500">กรุณาลองรีเฟรชหน้าเว็บใหม่อีกครั้ง</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-16 border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/60 rounded-3xl text-center space-y-3">
            <p className="text-neutral-800 dark:text-neutral-200 font-bold text-lg">ยังไม่มีงานแสดงที่เปิดจำหน่ายในขณะนี้</p>
            <p className="text-sm text-neutral-500">โปรดติดตามรอบการจำหน่ายบัตรคอนเสิร์ตเร็วๆ นี้</p>
          </div>
        ) : (
          <EventCatalogBrowser events={events} searchQuery={searchQuery} />
        )}
      </main>

      {/* 4. Site Footer matching docs/assets/prototype/index.html */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="brand-text">E-TIKKET</span>
            <p>แพลตฟอร์มระบบจำหน่ายบัตรคอนเสิร์ตและอีเวนต์ยุคใหม่ จองง่าย ปลอดภัย สแกนจ่ายด้วยพร้อมเพย์อัตโนมัติ</p>
          </div>
          <div className="footer-links">
            <span>Guest Checkout • CSPRNG QR Ticket • Re-entry Audit</span>
            <span className="copy">E-TIKKET Prototype &copy; 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
