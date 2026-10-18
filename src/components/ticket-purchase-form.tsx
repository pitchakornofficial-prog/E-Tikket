"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  LockIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
} from "@/components/icons";
import { formatPrice } from "@/lib/format";

interface TicketPurchaseFormProps {
  eventId: string;
  ticketPrice: number;
  availableQuantity: number;
  isSoldOut: boolean;
  studentDiscountActive?: boolean;
  studentPrice?: number | null;
}

export function TicketPurchaseForm({
  eventId,
  ticketPrice,
  availableQuantity,
  isSoldOut,
  studentDiscountActive,
  studentPrice,
}: TicketPurchaseFormProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student Privilege & OTP Verification State (AC-06, AC-07)
  const isStudentDomain = customerEmail.trim().toLowerCase().endsWith("@ubu.ac.th");
  const isStudentEligible = Boolean(studentDiscountActive && studentPrice && isStudentDomain);

  const [otpRequested, setOtpRequested] = useState(false);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number | null>(null);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 10-Minute Reservation Countdown effect
  useEffect(() => {
    if (otpCountdown === null || otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Request OTP handler
  const handleRequestOtp = async () => {
    const trimmedEmail = customerEmail.trim();
    if (!trimmedEmail) {
      setOtpError("กรุณากรอกอีเมลสถาบัน (@ubu.ac.th) ก่อนขอรหัส OTP");
      return;
    }
    if (!trimmedEmail.toLowerCase().endsWith("@ubu.ac.th")) {
      setOtpError("สิทธิ์ส่วนลดพิเศษสำหรับนักศึกษารองรับเฉพาะอีเมล @ubu.ac.th");
      return;
    }

    setOtpRequesting(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/checkout/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, eventId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error?.message || "ไม่สามารถส่งรหัส OTP ได้");
        return;
      }

      setOtpRequested(true);
      setOtpCountdown(data.expiresInSeconds || 600);
      setOtpDigits(["", "", "", "", "", ""]);
      // Focus first digit box
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 100);
    } catch {
      setOtpError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setOtpRequesting(false);
    }
  };

  // Verify OTP handler
  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      setOtpError("กรุณากรอกรหัส OTP 6 หลักให้ครบถ้วน");
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/checkout/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail.trim(),
          code,
          eventId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error?.message || "รหัส OTP ไม่ถูกต้อง");
        return;
      }

      setOtpVerified(true);
      setErrorMessage(null);
    } catch {
      setOtpError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setOtpVerifying(false);
    }
  };

  // 6 separate digit input handling
  const handleDigitChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, "");
    if (!sanitized) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    // If pasted full 6 digits
    if (sanitized.length >= 6) {
      const updated = sanitized.slice(0, 6).split("");
      setOtpDigits(updated);
      digitInputRefs.current[5]?.focus();
      return;
    }

    const updated = [...otpDigits];
    updated[index] = sanitized[sanitized.length - 1];
    setOtpDigits(updated);

    if (index < 5 && sanitized) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

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

  // Calculate pricing
  const effectivePrice = isStudentEligible && otpVerified && studentPrice ? studentPrice : ticketPrice;
  const regularTotal = ticketPrice * quantity;
  const subtotal = effectivePrice * quantity;
  const discountTotal = isStudentEligible && otpVerified ? regularTotal - subtotal : 0;

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

    // Require student OTP verification before completing order if student email entered on eligible event (AC-06, AC-07)
    if (isStudentEligible && !otpVerified) {
      setErrorMessage("กรุณายืนยันรหัส OTP ทางอีเมลสถาบัน (@ubu.ac.th) ให้เรียบร้อยเพื่อรับสิทธิ์ราคาพิเศษ");
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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

      {/* Countdown Timer Banner upon OTP Request */}
      {otpCountdown !== null && otpCountdown > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
          <ClockIcon className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            ระบบกำลังล็อกโควตาบัตรให้คุณ: กรุณาทำรายการภายใน{" "}
            <strong className="font-mono text-sm">{formatCountdown(otpCountdown)}</strong> นาที
          </span>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="space-y-1.5">
        <label htmlFor="ticket-quantity" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
          จำนวนบัตรที่ต้องการ
        </label>
        <div className="flex items-center gap-3">
          <input
            id="ticket-quantity"
            name="quantity"
            type="number"
            min={1}
            max={Math.min(4, availableQuantity)}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setQuantity(Math.max(1, Math.min(val, Math.min(4, availableQuantity))));
              }
            }}
            disabled={isSubmitting}
            className="w-24 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center font-bold"
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            เหลือ {availableQuantity} ใบ (สูงสุด 4 ใบ/ออเดอร์)
          </span>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-3">
        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-300">
          ข้อมูลผู้สั่งซื้อ (Guest Checkout)
        </p>

        {/* Customer Name */}
        <div className="space-y-1">
          <label htmlFor="cust-name" className="block text-xs text-neutral-600 dark:text-neutral-400">
            ชื่อ - นามสกุล ผู้รับบัตร <span className="text-red-500">*</span>
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
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="cust-email" className="block text-xs text-neutral-600 dark:text-neutral-400">
              อีเมลสำหรับรับบัตร E-Ticket <span className="text-red-500">*</span>
            </label>
            {studentDiscountActive && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                🎓 ใช้ @ubu.ac.th เพื่อรับราคานักศึกษา
              </span>
            )}
          </div>
          <input
            id="cust-email"
            name="customerEmail"
            type="email"
            required
            placeholder="john@example.com หรือ student@ubu.ac.th"
            value={customerEmail}
            onChange={(e) => {
              setCustomerEmail(e.target.value);
              // Reset OTP status if email changes
              setOtpVerified(false);
              setOtpRequested(false);
              setOtpError(null);
            }}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white min-h-[40px]"
          />
        </div>

        {/* Step 3: Student OTP Verification Box (AC-06, AC-07) */}
        {isStudentEligible && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-300 dark:border-neutral-700 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>🎓 ยืนยันสิทธิ์นักศึกษา (@ubu.ac.th)</span>
              </span>
              {!otpVerified && (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpRequesting || !customerEmail.trim()}
                  className="px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black rounded text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {otpRequesting ? "กำลังส่ง..." : otpRequested ? "ขอรหัสใหม่" : "ขอรหัส OTP"}
                </button>
              )}
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              รหัส OTP 6 หลัก จะถูกส่งไปยัง: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{customerEmail.trim()}</strong>
            </p>

            {/* OTP 6 Digit Inputs Area */}
            {otpRequested && !otpVerified && (
              <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 block">
                  กรุณากรอกรหัส 6 หลักที่ได้รับในอีเมล:
                </span>
                <div className="flex gap-2 justify-center my-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        digitInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      className="w-10 h-11 text-center text-lg font-bold font-mono border rounded-lg bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white shadow-sm"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500">
                    ทดสอบในระบบ: กรอก <strong>1 2 3 4 5 6</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpDigits.join("").length < 6}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {otpVerifying ? "กำลังตรวจสอบ..." : "ยืนยัน OTP"}
                  </button>
                </div>
              </div>
            )}

            {/* Verified Discount Badge */}
            {otpVerified && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckIcon className="w-4 h-4 stroke-[3] text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">✓ ยืนยันอีเมลสำเร็จ! ได้รับสิทธิ์ราคาพิเศษนักศึกษา</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    ใช้อีเมลสถาบัน (@ubu.ac.th) ได้รับส่วนลดเหลือ <strong>฿{formatPrice(studentPrice || 0, true)} / ใบ</strong> (ประหยัด ฿{formatPrice(ticketPrice - (studentPrice || 0), true)} ต่อใบ)
                  </p>
                </div>
              </div>
            )}

            {otpError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}
          </div>
        )}

        {/* Confirm Email */}
        <div className="space-y-1">
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
        <div className="space-y-1">
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
      <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2">
        <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
          <span>ราคาบัตรปกติ ({quantity} ใบ × ฿{formatPrice(ticketPrice, true)})</span>
          <span className="font-mono text-neutral-900 dark:text-neutral-200">฿{formatPrice(regularTotal, true)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>ส่วนลดนักศึกษา (@ubu.ac.th)</span>
            <span className="font-mono">-฿{formatPrice(discountTotal, true)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-bold text-neutral-900 dark:text-white">ยอดรวมสุทธิ</span>
          <span className="text-lg font-black text-neutral-900 dark:text-white font-mono">฿{formatPrice(subtotal, true)}</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || (isStudentEligible && !otpVerified)}
        className="btn btn-lime btn-lg full-width font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-center"
      >
        {isSubmitting ? (
          "กำลังดำเนินการ..."
        ) : (
          <span className="inline-flex items-center gap-1.5">
            ยืนยันคำสั่งซื้อซื้อบัตรเข้างาน <ArrowRightIcon className="w-4 h-4" />
          </span>
        )}
      </button>

      {isStudentEligible && !otpVerified && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium">
          * กรุณากดขอรหัสและยืนยัน OTP ก่อนยืนยันคำสั่งซื้อ
        </p>
      )}

      <p className="text-[11px] text-neutral-500 text-center leading-relaxed inline-flex items-center justify-center gap-1.5 w-full">
        <LockIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span>ระบบจะล็อกจองบัตรให้ท่านเป็นเวลา 15 นาทีหลังจากกดยืนยัน</span>
      </p>
    </form>
  );
}
