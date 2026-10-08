"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, LockIcon, ArrowRightIcon } from "@/components/icons";
import { formatPrice } from "@/lib/format";

interface TicketPurchaseFormProps {
  eventId: string;
  ticketPrice: number;
  availableQuantity: number;
  isSoldOut: boolean;
}

export function TicketPurchaseForm({
  eventId,
  ticketPrice,
  availableQuantity,
  isSoldOut,
}: TicketPurchaseFormProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isSoldOut || availableQuantity <= 0) {
    return (
      <div className="space-y-4">
        <button
          disabled
          className="w-full min-h-[44px] py-3 px-4 bg-neutral-900 border border-neutral-800 text-neutral-500 font-bold rounded text-sm cursor-not-allowed text-center"
        >
          บัตรหมดแล้ว
        </button>
        <p className="text-xs text-neutral-500 text-center">
          ขออภัย บัตรสำหรับงานแสดงนี้ถูกจองและจำหน่ายหมดแล้ว
        </p>
      </div>
    );
  }

  const subtotal = ticketPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim();
    const trimmedConfirmEmail = confirmEmail.trim();
    const trimmedPhone = customerPhone.trim();

    if (!trimmedName) {
      setErrorMessage("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage("กรุณากรอกอีเมล");
      return;
    }
    if (!trimmedConfirmEmail) {
      setErrorMessage("กรุณายืนยันอีเมลอีกครั้ง");
      return;
    }
    if (trimmedEmail.toLowerCase() !== trimmedConfirmEmail.toLowerCase()) {
      setErrorMessage("อีเมลและช่องยืนยันอีเมลไม่ตรงกัน กรุณาตรวจสอบตัวสะกด");
      return;
    }
    if (!trimmedPhone) {
      setErrorMessage("กรุณากรอกเบอร์โทรศัพท์");
      return;
    }
    if (quantity < 1 || quantity > availableQuantity) {
      setErrorMessage(`จำนวนบัตรต้องอยู่ระหว่าง 1 ถึง ${availableQuantity} ใบ`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error?.message || "เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
        setIsSubmitting(false);
        return;
      }

      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
      } else {
        router.push(`/checkout/${data.orderId}?token=${data.checkoutToken}`);
      }
    } catch {
      setErrorMessage("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 bg-red-950/60 border border-red-700/80 rounded text-red-300 text-xs leading-relaxed flex items-center gap-2"
        >
          <AlertTriangleIcon className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="space-y-1.5">
        <label htmlFor="ticket-quantity" className="block text-xs font-medium text-neutral-300">
          จำนวนบัตรที่ต้องการ
        </label>
        <div className="flex items-center gap-3">
          <input
            id="ticket-quantity"
            name="quantity"
            type="number"
            min={1}
            max={availableQuantity}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setQuantity(Math.max(1, Math.min(val, availableQuantity)));
              }
            }}
            disabled={isSubmitting}
            className="w-24 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center font-bold"
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            เหลือ {availableQuantity} ใบ
          </span>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-300 mb-3">
          ข้อมูลผู้สั่งซื้อ (ไม่ต้องสมัครสมาชิก)
        </p>

        {/* Customer Name */}
        <div className="space-y-1.5 mb-3">
          <label htmlFor="cust-name" className="block text-xs text-neutral-600 dark:text-neutral-400">
            ชื่อ - นามสกุล <span className="text-red-500">*</span>
          </label>
          <input
            id="cust-name"
            name="customerName"
            type="text"
            required
            placeholder="เช่น สมชาย ใจดี"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white min-h-[40px]"
          />
        </div>

        {/* Customer Email */}
        <div className="space-y-1.5 mb-3">
          <label htmlFor="cust-email" className="block text-xs text-neutral-600 dark:text-neutral-400">
            อีเมลสำหรับรับบัตร E-Ticket <span className="text-red-500">*</span>
          </label>
          <input
            id="cust-email"
            name="customerEmail"
            type="email"
            required
            placeholder="john@example.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white min-h-[40px]"
          />
        </div>

        {/* Confirm Email */}
        <div className="space-y-1.5 mb-3">
          <label htmlFor="cust-confirm-email" className="block text-xs text-neutral-600 dark:text-neutral-400">
            ยืนยันอีเมลอีกครั้ง (Confirm Email) <span className="text-red-500">*</span>
          </label>
          <input
            id="cust-confirm-email"
            name="confirmEmail"
            type="email"
            required
            placeholder="กรอกอีเมลเดิมเพื่อยืนยันความถูกต้อง"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            disabled={isSubmitting}
            className={`w-full px-3 py-2 bg-white dark:bg-neutral-900 border rounded text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 min-h-[40px] transition-colors ${
              confirmEmail.length > 0 && confirmEmail.trim().toLowerCase() !== customerEmail.trim().toLowerCase()
                ? "border-red-500 dark:border-red-500 focus:ring-red-500"
                : confirmEmail.length > 0 && confirmEmail.trim().toLowerCase() === customerEmail.trim().toLowerCase()
                ? "border-emerald-500 dark:border-emerald-500 focus:ring-emerald-500"
                : "border-neutral-300 dark:border-neutral-700 focus:ring-black dark:focus:ring-white"
            }`}
          />
          {confirmEmail.length > 0 && confirmEmail.trim().toLowerCase() !== customerEmail.trim().toLowerCase() ? (
            <p className="text-[11px] text-red-500 font-medium">
              อีเมลไม่ตรงกัน กรุณาตรวจสอบตัวสะกด
            </p>
          ) : confirmEmail.length > 0 && confirmEmail.trim().toLowerCase() === customerEmail.trim().toLowerCase() ? (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ อีเมลตรงกันเรียบร้อย
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              ระบบจะส่ง E-Ticket และ QR Code ไปยังอีเมลนี้หลังยืนยันการชำระเงิน
            </p>
          )}
        </div>

        {/* Customer Phone */}
        <div className="space-y-1.5 mb-3">
          <label htmlFor="cust-phone" className="block text-xs text-neutral-600 dark:text-neutral-400">
            เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span>
          </label>
          <input
            id="cust-phone"
            name="customerPhone"
            type="tel"
            required
            placeholder="08X-XXX-XXXX"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white min-h-[40px]"
          />
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded space-y-2">
        <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
          <span>ราคาบัตรรวม ({quantity} ใบ)</span>
          <span className="font-mono text-neutral-900 dark:text-neutral-200">฿{formatPrice(subtotal, true)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-bold text-neutral-900 dark:text-white">ยอดรวมสุทธิ</span>
          <span className="text-lg font-black text-neutral-900 dark:text-white font-mono">฿{formatPrice(subtotal, true)}</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[44px] py-3 px-4 bg-white text-black font-bold rounded text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center text-center focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          "กำลังดำเนินการ..."
        ) : (
          <span className="inline-flex items-center gap-1.5">
            ยืนยันคำสั่งซื้อ <ArrowRightIcon className="w-4 h-4" />
          </span>
        )}
      </button>

      <p className="text-[11px] text-neutral-500 text-center leading-relaxed inline-flex items-center justify-center gap-1.5 w-full">
        <LockIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span>ระบบจะล็อกจองบัตรให้ท่านเป็นเวลา 15 นาทีหลังจากกดยืนยัน</span>
      </p>
    </form>
  );
}
