"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface TicketOrder {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity: number;
  totalAmount: string;
  status: "PAID" | "WAITING_FOR_VERIFY" | "REJECTED" | "PENDING_PAYMENT" | "EXPIRED" | "CANCELLED";
  viewUrl?: string | null;
  createdAt?: string;
  ticketTier?: string | null;
  event: {
    id: string;
    name: string;
    category?: string;
    eventDate: string;
    startTime?: string;
    venue: string;
    imageUrl?: string;
  };
  tickets: Array<{
    ticketNumber: string;
    status: string;
  }>;
}

export default function MyTicketsPage() {
  const [email, setEmail] = useState("student@ubu.ac.th");
  const [phone, setPhone] = useState("089-765-4321");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("กรุณากรอกอีเมลที่ใช้สั่งซื้อ");
      return;
    }

    setLoading(true);
    setError(null);
    setMagicLinkSent(false);

    try {
      const res = await fetch(`/api/tickets/lookup?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "ไม่สามารถค้นหาตั๋วได้ กรุณาลองใหม่อีกครั้ง");
        setOrders([]);
      } else {
        setOrders(data.orders || []);
        setSearched(true);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (orderId: string) => {
    setSendingMagicLink(true);
    try {
      const res = await fetch("/api/tickets/reissue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email }),
      });
      if (res.ok) {
        setMagicLinkSent(true);
      } else {
        const d = await res.json();
        alert(d.error?.message || "เกิดข้อผิดพลาดในการส่งลิงก์");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSendingMagicLink(false);
    }
  };

  return (
    <div>
      {/* Site Header */}
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

      {/* 3. Main Content matching docs/assets/prototype/my-tickets.html */}
      <main className="main-content">
        <div className="lookup-container">
          {/* Header Card with Search Form */}
          <div className="lookup-header-card">
            <div className="lookup-icon-wrap">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h1 className="lookup-title">ค้นหาบัตรคอนเสิร์ตของฉัน</h1>
            <p className="lookup-sub">
              กรอกอีเมลและเบอร์โทรศัพท์ที่ใช้ในการสั่งซื้อ เพื่อตรวจสอบสถานะคำสั่งซื้อและรับลิงก์เปิดบัตรเข้างาน
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="lookup-form">
              <div className="form-group">
                <label className="form-label" htmlFor="lookup-email">
                  อีเมลที่ใช้สั่งซื้อ *
                </label>
                <input
                  type="email"
                  id="lookup-email"
                  required
                  placeholder="เช่น student@ubu.ac.th"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lookup-phone">
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  id="lookup-phone"
                  required
                  placeholder="เช่น 089-765-4321"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium text-center pb-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-lime btn-lg full-width font-bold cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? "กำลังค้นหา..." : "ค้นหาประวัติการจองบัตร"}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>
          </div>

          {/* Results: Strictly NO QR Code Displayed on Screen (Zero Leak Policy) */}
          {searched && orders.length === 0 && (
            <div className="lookup-result-card text-center p-8">
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                ไม่พบประวัติการสั่งซื้อสำหรับอีเมล <strong>{email}</strong>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                กรุณาตรวจสอบการสะกดอีเมล หรือติดต่อผู้จัดงาน
              </p>
            </div>
          )}

          {searched &&
            orders.map((ord) => (
              <div key={ord.orderId} className="lookup-result-card">
                <div className="result-header">
                  <div>
                    <span
                      className={`badge ${
                        ord.status === "PAID"
                          ? "badge-lime"
                          : ord.status === "WAITING_FOR_VERIFY"
                          ? "badge-dark"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {ord.status === "PAID"
                        ? "พบคำสั่งซื้อ (PAID • ชำระเงินแล้ว)"
                        : ord.status === "WAITING_FOR_VERIFY"
                        ? "รอการตรวจสอบยอดเงิน"
                        : ord.status}
                    </span>
                    <h2 className="result-event-name">{ord.event.name}</h2>
                    <p className="result-event-meta">
                      📅 {ord.event.eventDate} • 📍 {ord.event.venue}
                    </p>
                  </div>
                  <div className="result-order-ref">
                    <span className="ref-lbl">Order Ref</span>
                    <strong>#{ord.orderId.slice(-8).toUpperCase()}</strong>
                  </div>
                </div>

                <div className="result-details-grid">
                  <div className="detail-cell">
                    <span className="cell-lbl">ชื่อผู้รับบัตร</span>
                    <strong className="cell-val">{ord.customerName}</strong>
                  </div>
                  <div className="detail-cell">
                    <span className="cell-lbl">จำนวนบัตร</span>
                    <strong className="cell-val">
                      {ord.quantity} ใบ {ord.ticketTier ? `(${ord.ticketTier})` : ""}
                    </strong>
                  </div>
                  <div className="detail-cell">
                    <span className="cell-lbl">ยอดชำระสุทธิ</span>
                    <strong className="cell-val">
                      ฿{formatPrice(ord.totalAmount, true)}
                    </strong>
                  </div>
                  <div className="detail-cell">
                    <span className="cell-lbl">สถานะบัตร</span>
                    <strong
                      className="cell-val"
                      style={{
                        color: ord.status === "PAID" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {ord.status === "PAID"
                        ? "✓ ออกบัตรเรียบร้อยแล้ว"
                        : "⏳ รออนุมัติการชำระเงิน"}
                    </strong>
                  </div>
                </div>

                {/* Security Gate Notice: No QR Code Shown Directly */}
                <div className="security-privacy-notice">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <div className="notice-txt">
                    <strong>มาตรการรักษาความปลอดภัยสูงสุด (Zero Leak Policy)</strong>
                    <p>
                      เพื่อป้องกันบุคคลอื่นนำเบอร์โทรศัพท์มาแอบดู QR Code ระบบจะไม่แสดง QR Code บนหน้าจอนี้ กรุณากดปุ่มด้านล่างเพื่อรับ <strong>Magic Link</strong> สำหรับเปิดบัตรส่งตรงเข้าอีเมลของคุณ
                    </p>
                  </div>
                </div>

                {/* Magic Link Action Button */}
                <button
                  type="button"
                  disabled={sendingMagicLink}
                  onClick={() => handleSendMagicLink(ord.orderId)}
                  className="btn btn-dark btn-lg full-width font-bold cursor-pointer disabled:opacity-50"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>
                    {sendingMagicLink
                      ? "กำลังส่ง Magic Link..."
                      : `ส่งลิงก์เปิดบัตร (Magic Link) ไปยังอีเมล ${ord.customerEmail}`}
                  </span>
                </button>

                {magicLinkSent && (
                  <div
                    className="magic-sent-box mt-3"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid #10b981",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      color: "#10b981",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>
                      ส่งลิงก์เปิดดูบัตรเรียบร้อยแล้ว! กรุณาเช็กกล่องข้อความหรืออีเมลของคุณ
                    </span>
                  </div>
                )}
              </div>
            ))}
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
