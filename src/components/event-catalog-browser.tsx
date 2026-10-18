"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export interface CatalogEvent {
  id: string;
  name: string;
  category: string;
  genre?: string | null;
  description: string;
  imageUrl: string;
  posterVerticalUrl?: string | null;
  posterHorizontalUrl?: string | null;
  eventDate: string;
  startTime: string;
  doorsOpenTime?: string | null;
  showStartTime?: string | null;
  showEndTime?: string | null;
  venue: string;
  ticketPrice: string;
  availableQuantity: number;
  artists?: string | null;
  googleMapsUrl?: string | null;
  studentDiscountActive?: boolean;
  studentPrice?: string | null;
}

interface EventCatalogBrowserProps {
  events: CatalogEvent[];
  searchQuery?: string;
}

export function EventCatalogBrowser({ events, searchQuery = "" }: EventCatalogBrowserProps) {
  // 1. Featured Top Event (Indie Live Wave 2026 or soonest upcoming)
  const featuredEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const indieWave = events.find((e) => e.name.includes("Indie Live Wave"));
    if (indieWave) return indieWave;
    return events[0];
  }, [events]);

  // 2. Filter events matching search query from the navbar search bar
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return events;
    return events.filter((e) => {
      const matchName = e.name.toLowerCase().includes(q);
      const matchVenue = e.venue.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      const matchGenre = e.genre?.toLowerCase().includes(q) ?? false;
      const matchArtists = e.artists?.toLowerCase().includes(q) ?? false;
      return matchName || matchVenue || matchCat || matchGenre || matchArtists;
    });
  }, [events, searchQuery]);

  return (
    <>
      {/* Top Zone: 16:9 Landscape Poster for Top Featured Event (Strictly No Text Overlay) */}
      {featuredEvent && (
        <section className="featured-landscape-section">
          <div className="section-tag-row">
            <span className="badge badge-lime">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              HIGHLIGHT OF THE WEEK
            </span>
            <span className="badge badge-dark">เปิดจำหน่ายบัตรออนไลน์</span>
          </div>

          <div className="landscape-poster-card">
            {/* 16:9 Landscape Poster Image (Clean, No Overlay Text) */}
            <div className="landscape-poster-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredEvent.posterHorizontalUrl || featuredEvent.imageUrl}
                alt={`${featuredEvent.name} Poster`}
                className="landscape-img"
              />
            </div>

            {/* Details Strictly Below the Poster Image */}
            <div className="landscape-details-box">
              <div className="landscape-info">
                <span className="event-cat-tag">
                  {featuredEvent.genre || "LIVE CONCERT • INDIE FESTIVAL"}
                </span>
                <h1 className="landscape-title">{featuredEvent.name}</h1>
                <p className="landscape-meta">
                  <span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    เสาร์ที่ 24 ตุลาคม 2026 • {featuredEvent.startTime} น.
                  </span>
                  <span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {featuredEvent.venue}
                  </span>
                </p>
              </div>

              <div className="landscape-action-row">
                <div className="price-display">
                  <span className="price-lbl">ราคาบัตร</span>
                  <div className="price-val-row">
                    <strong className="main-price">
                      ฿{formatPrice(featuredEvent.ticketPrice)}
                    </strong>
                  </div>
                </div>
                <Link
                  href={`/events/${featuredEvent.id}`}
                  className="btn btn-lime btn-lg"
                  data-prototype-target="event-v6"
                >
                  <span>ซื้อบัตร / ดูรายละเอียด</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Zone: 3:4 / 4:5 Vertical Posters Grid (Strictly No Text Overlay) */}
      <section className="catalog-grid-section">
        <div className="section-heading-bar">
          <div>
            <span className="section-eyebrow">ALL CONCERTS & EVENTS</span>
            <h2 className="section-title">คอนเสิร์ตและงานแสดงทั้งหมด</h2>
          </div>
          <span className="catalog-count-badge">แสดง {filteredEvents.length} รายการ</span>
        </div>

        <div className="vertical-posters-grid" id="events-grid">
          {filteredEvents.map((event) => (
            <article key={event.id} className="vertical-event-card">
              <div className="vertical-poster-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.posterVerticalUrl || event.imageUrl}
                  alt={event.name}
                  className="vertical-img"
                />
              </div>
              <div className="vertical-card-body">
                <span className="event-cat-tag">
                  {event.genre || "LIVE CONCERT • INDIE"}
                </span>
                <h3 className="vertical-card-title">{event.name}</h3>
                <p className="vertical-card-meta">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                  </svg>
                  {event.eventDate} • {event.startTime} น.
                </p>
                <p className="vertical-card-meta">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {event.venue}
                </p>
                <div className="vertical-price-box">
                  <div className="price-val-row">
                    <strong>฿{formatPrice(event.ticketPrice)}</strong>
                  </div>
                </div>
                <Link
                  href={`/events/${event.id}`}
                  className="btn btn-dark full-width"
                  data-prototype-target="event-v6"
                >
                  ซื้อบัตร →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Bottom FAQ & Contact Zone */}
      <section className="home-bottom-section">
        <div className="bottom-grid">
          {/* FAQ Accordion */}
          <div className="faq-container">
            <span className="section-eyebrow">HELP & SUPPORT</span>
            <h2 className="faq-title">คำถามที่พบบ่อย (FAQ)</h2>

            <div className="faq-accordion">
              <details className="faq-item" open>
                <summary className="faq-question">
                  <span>ซื้อบัตรแล้วจะได้รับตั๋วอย่างไร?</span>
                  <svg
                    className="chevron-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                <div className="faq-answer">
                  เมื่อชำระเงินผ่าน PromptPay QR เรียบร้อย ระบบจะออกตั๋วพร้อม QR Code บนหน้าจอทันที และส่งลิงก์เปิดตั๋วเข้าอีเมลของคุณโดยอัตโนมัติ โดยไม่ต้องสมัครสมาชิกหรือจำรหัสผ่าน
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>สิทธิพิเศษนักศึกษา (@ubu.ac.th) ใช้งานอย่างไร?</span>
                  <svg
                    className="chevron-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                <div className="faq-answer">
                  ในขั้นตอนกรอกข้อมูล เพียงระบุอีเมลสถาบันที่ลงท้ายด้วย @ubu.ac.th ระบบจะตรวจจับและปรับราคาบัตรเป็นราคานักศึกษาคงที่ (เช่น ฿150 เหลือ ฿79) ให้อัตโนมัติทันที
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>บัตรคอนเสิร์ตรองรับการเข้า-ออกงาน (Re-entry) หรือไม่?</span>
                  <svg
                    className="chevron-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                <div className="faq-answer">
                  รองรับครับ บัตรทุกใบมีระบบบันทึกสถานะ เมื่อต้องการออกจากงานชั่วคราว ให้แจ้งสต๊าฟสแกนออก (Check-out) และเมื่อกลับเข้ามาให้สแกนเข้าใหม่ (Check-in) ได้อย่างปลอดภัย
                </div>
              </details>
            </div>
          </div>

          {/* Contact Support Card */}
          <div className="contact-card">
            <span className="section-eyebrow">CONTACT US</span>
            <h3 className="contact-title">ติดต่อสอบถาม & แจ้งปัญหา</h3>
            <p className="contact-desc">
              หากพบปัญหาในการสั่งซื้อ ชำระเงิน หรือต้องการนำงานของคุณมาเปิดขายบัตรบนแพลตฟอร์ม
            </p>

            <div className="contact-links-list">
              <div className="contact-item">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>support@e-tikket.com</span>
              </div>
              <div className="contact-item">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>LINE Official: @e-tikket</span>
              </div>
              <div className="contact-item">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>เวลาทำการทีมซัพพอร์ต: ทุกวัน 09:00 - 22:00 น.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
