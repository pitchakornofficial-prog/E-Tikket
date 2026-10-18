import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateAvailableTickets } from "@/lib/inventory";
import { TicketPurchaseForm } from "@/components/ticket-purchase-form";
import { PrototypeControlBar } from "@/components/prototype-control-bar";
import { formatPrice } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  let event = null;
  try {
    event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { name: true },
        },
        articles: {
          where: { status: "PUBLISHED" },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImageUrl: true,
            publishedAt: true,
            createdAt: true,
            category: { select: { name: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 3,
        },
      },
    });
  } catch {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="max-w-md w-full p-8 border border-slate-300 bg-white rounded-2xl text-center space-y-4 shadow-sm">
          <h1 className="text-xl font-bold text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</h1>
          <p className="text-sm text-slate-600">ระบบไม่สามารถโหลดข้อมูลงานแสดงได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            ← กลับสู่หน้ารวมงานแสดง
          </Link>
        </div>
      </div>
    );
  }

  if (!event || event.status !== "PUBLISHED") {
    notFound();
  }

  const availableQuantity = await calculateAvailableTickets(
    event.id,
    event.totalTickets,
    new Date(),
  );

  const isSoldOut = availableQuantity <= 0;
  const formattedDate = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(event.eventDate));

  const artistsList = event.artists
    ? event.artists.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  return (
    <div data-prototype-page="event" data-prototype-id="event-v6">
      {/* 1. Prototype Control Bar */}
      <PrototypeControlBar firstEventId={event.id} />

      {/* 2. Site Header */}
      <header className="site-header">
        <div className="header-container">
          <Link href="/" className="brand">
            <span className="brand-text">E-TIKKET</span>
            <span className="brand-dot"></span>
          </Link>
          <nav className="nav-actions">
            <Link href="/" className="nav-link">
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
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              ย้อนกลับไปหน้าแรก
            </Link>
          </nav>
        </div>
      </header>

      {/* 3. Main Content matching docs/assets/prototype/event-detail.html */}
      <main className="main-content">
        <div className="event-page-container">
          {/* Section 1: 16:9 Landscape Poster Banner (Strictly No Text Overlay) */}
          <section className="detail-poster-section">
            <div className="landscape-poster-wrap detail-view">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.posterHorizontalUrl || event.imageUrl}
                alt={event.name}
                className="landscape-img"
              />
            </div>
          </section>

          {/* Section 2: Box to Purchase Tickets (Inside Content, Clean, No Sticky Floating Bar) */}
          <section className="ticket-purchase-box">
            <div className="purchase-box-header">
              <div>
                <span className="event-cat-tag">
                  {event.genre || "TICKET BOOKING • LIVE CONCERT"}
                </span>
                <h1 className="event-main-title">{event.name}</h1>
                <p className="event-brief-meta">
                  <span>📅 {formattedDate}</span>
                  <span>
                    ⏰ ประตูเปิด {event.doorsOpenTime || "17:00"} น. • เริ่มแสดง{" "}
                    {event.showStartTime || event.startTime} -{" "}
                    {event.showEndTime || "23:00"} น.
                  </span>
                  <span>
                    📍 {event.venue}{" "}
                    {event.googleMapsUrl && (
                      <a
                        href={event.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--lime-accent)",
                          textDecoration: "underline",
                          marginLeft: "4px",
                          fontWeight: 600,
                        }}
                      >
                        (เปิด Map ↗)
                      </a>
                    )}
                  </span>
                </p>
              </div>
              <div className="pricing-summary-block">
                <span className="price-prefix">ราคาบัตรเข้างาน</span>
                <div className="price-val-row">
                  <strong className="main-price">
                    ฿{formatPrice(event.ticketPrice, true)}
                  </strong>
                </div>
                {event.studentDiscountActive && event.studentPrice && (
                  <span className="badge badge-lime mt-1" style={{ fontSize: "11px" }}>
                    🎓 สิทธิ์นักศึกษา @ubu.ac.th เหลือ ฿{formatPrice(event.studentPrice, true)}
                  </span>
                )}
              </div>
            </div>

            <div className="purchase-box-controls">
              <div className="ticket-type-selector">
                <label className="form-label">รอบการแสดงและประเภทบัตร</label>
                <div className="round-chip active">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                  </svg>
                  <span>
                    รอบ {formattedDate} ({event.showStartTime || event.startTime} น.) —
                    บัตรเข้างานทั่วไป (General Admission)
                  </span>
                </div>
              </div>

              {/* Guest Checkout Form */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <TicketPurchaseForm
                  eventId={event.id}
                  ticketPrice={Number(event.ticketPrice)}
                  studentDiscountActive={event.studentDiscountActive}
                  studentPrice={event.studentPrice ? Number(event.studentPrice) : null}
                  availableQuantity={availableQuantity}
                  isSoldOut={isSoldOut}
                />
              </div>

              <div className="text-center pt-2">
                <span className="quota-hint">
                  ⚡ เหลือบัตร {availableQuantity} ใบ • จำกัดซื้อได้ไม่เกิน 4 ใบต่อ 1 ออเดอร์
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Comprehensive Event Details Grid */}
          <section className="detail-content-section">
            {/* 1. ข้อมูลสำคัญของงาน (Event Highlights Overview) */}
            <div className="content-card">
              <h2 className="content-heading">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                ข้อมูลภาพรวมของงานแสดง
              </h2>
              <div className="event-meta-spec-grid">
                <div className="spec-item">
                  <span className="spec-label">ชื่องาน</span>
                  <strong className="spec-val">{event.name}</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">ผู้จัดงาน (Organizer)</span>
                  <strong className="spec-val">
                    {event.organizer.name}
                    <span className="verified-organizer-badge ml-2 inline-flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      ยืนยันตัวตนแล้ว
                    </span>
                  </strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">วันที่จัดงาน</span>
                  <strong className="spec-val">{formattedDate}</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">เวลาเปิดประตู & เวลาแสดง</span>
                  <strong className="spec-val">
                    ประตูเปิด {event.doorsOpenTime || "17:00"} น. | การแสดงเริ่ม{" "}
                    {event.showStartTime || event.startTime} -{" "}
                    {event.showEndTime || "23:00"} น.
                  </strong>
                </div>
                <div className="spec-item full-span">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <span className="spec-label" style={{ marginBottom: 0 }}>
                      สถานที่จัดงาน
                    </span>
                    {event.googleMapsUrl && (
                      <a
                        href={event.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: "11px",
                          padding: "2px 10px",
                          borderRadius: "4px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          color: "var(--text-main)",
                          borderColor: "var(--border-subtle)",
                          textDecoration: "none",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                        </svg>
                        <span>📍 เปิด Google Maps นำทาง ↗</span>
                      </a>
                    )}
                  </div>
                  <strong className="spec-val">{event.venue}</strong>
                </div>
              </div>
            </div>

            {/* 2. รายชื่อศิลปิน (Artist Lineup) */}
            {artistsList.length > 0 && (
              <div className="content-card">
                <h2 className="content-heading">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                  รายชื่อศิลปิน (Artist Lineup)
                </h2>
                <p className="content-paragraph">
                  พบกับวงดนตรีและศิลปินที่จะมาร่วมถ่ายทอดเสียงดนตรีสดตลอดค่ำคืน:
                </p>
                <div className="lineup-grid">
                  {artistsList.map((artist, idx) => (
                    <div key={idx} className="artist-badge">
                      🎸 {artist}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. รายละเอียดงาน (Event Description) */}
            <div className="content-card">
              <h2 className="content-heading">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                รายละเอียดงาน & บรรยากาศภายในงาน
              </h2>
              <p className="content-paragraph whitespace-pre-line">{event.description}</p>
            </div>

            {/* 4. แผนที่สถานที่จัดงาน (Venue & Embed Map) */}
            <div className="content-card">
              <h2 className="content-heading">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                สถานที่จัดแสดง & แผนที่การเดินทาง
              </h2>
              <p className="content-paragraph">
                <strong>{event.venue}</strong>
              </p>

              <div className="embed-map-wrapper">
                <div className="w-full h-64 rounded-xl overflow-hidden relative">
                  <iframe
                    title={`แผนที่สถานที่ ${event.venue}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      event.venue,
                    )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="map-action-bar">
                  <span>สถานที่: {event.venue}</span>
                  <a
                    href={
                      event.googleMapsUrl ||
                      `https://maps.google.com/?q=${encodeURIComponent(event.venue)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    เปิดใน Google Maps ↗
                  </a>
                </div>
              </div>
            </div>

            {/* 5. วิธีการชำระเงิน (PromptPay Auto) */}
            <div className="content-card">
              <h2 className="content-heading">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                วิธีการชำระเงิน (PromptPay ตรวจสอบอัตโนมัติ)
              </h2>
              <div className="payment-explain-steps">
                <div className="explain-step">
                  <span className="step-num">1</span>
                  <div>
                    <strong>สแกน PromptPay QR Code</strong>
                    <p>สแกนชำระเงินผ่านแอปพลิเคชันของทุกธนาคารในไทย</p>
                  </div>
                </div>
                <div className="explain-step">
                  <span className="step-num">2</span>
                  <div>
                    <strong>ระบบตรวจเงินเข้าอัตโนมัติ 1-2 วินาที</strong>
                    <p>
                      ตรวจสอบเงินโอนทันที <strong>ไม่ต้องอัปโหลดสลิป</strong>{" "}
                      และไม่ต้องรอแอดมิน
                    </p>
                  </div>
                </div>
                <div className="explain-step">
                  <span className="step-num">3</span>
                  <div>
                    <strong>รับตั๋ว QR เข้างานทันที</strong>
                    <p>หน้าจอออกตั๋วทันที พร้อมส่งลิงก์สำรองเข้าอีเมลของคุณ</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. เงื่อนไขการเข้างาน & Re-entry Policy */}
            <div className="content-card">
              <h2 className="content-heading">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                เงื่อนไขการเข้างานและนโยบาย Re-entry
              </h2>
              <ul className="condition-list">
                <li>
                  <strong>การสแกนบัตร:</strong> แสดงบัตร QR Code
                  ผ่านหน้าจอมือถือให้เจ้าหน้าที่สแกนที่ประตูทางเข้า
                </li>
                <li>
                  <strong>การเข้า-ออกงาน (Re-entry):</strong> หากมีความจำเป็นต้องออกจากพื้นที่งานชั่วคราว
                  ให้แจ้งเจ้าหน้าที่สแกนออก (Check-out) และสแกนเข้าใหม่ (Check-in) ได้อย่างปลอดภัย
                </li>
                <li>
                  <strong>จำกัดการสั่งซื้อ:</strong> ซื้อได้สูงสุดไม่เกิน 4 ใบ ต่อ 1 ออเดอร์
                </li>
                {event.entryRules && (
                  <li>
                    <strong>ข้อกำหนดเพิ่มเติม:</strong> {event.entryRules}
                  </li>
                )}
              </ul>
            </div>

            {/* 7. Related Articles (If Any) */}
            {event.articles && event.articles.length > 0 && (
              <div className="content-card">
                <h2 className="content-heading">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  บทความและข่าวสารที่เกี่ยวข้อง (Related Articles)
                </h2>
                <div className="space-y-3 mt-3">
                  {event.articles.map((art) => (
                    <Link
                      key={art.id}
                      href={`/news/${art.slug}`}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors group"
                    >
                      {art.coverImageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={art.coverImageUrl}
                            alt={art.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {art.category.name}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-black line-clamp-1 mt-1">
                          {art.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {art.excerpt || ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 4. Site Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="brand-text">E-TIKKET</span>
            <p>
              แพลตฟอร์มระบบจำหน่ายบัตรคอนเสิร์ตและอีเวนต์ยุคใหม่ จองง่าย ปลอดภัย สแกนจ่ายด้วยพร้อมเพย์อัตโนมัติ
            </p>
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
