import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface RejectionEmailPayload {
  to: string;
  customerName: string;
  orderId: string;
  eventName: string;
  reason?: string | null;
}

export interface TicketEmailPayload {
  to: string;
  customerName: string;
  orderId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  venue: string;
  tickets: Array<{
    ticketNumber: string;
    qrDataUrl: string;
  }>;
  viewUrl: string;
}

export interface ReissueTicketEmailPayload {
  to: string;
  customerName: string;
  orderId: string;
  eventName: string;
  oldTicketNumber: string;
  newTicketNumber: string;
  viewUrl: string;
}

let emailFailureInjection = false;

export function setEmailFailureInjection(fail: boolean) {
  emailFailureInjection = fail;
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM || "TICKETBOX <noreply@etikket.com>";
}

/**
 * Dispatch an email using:
 * 1. Resend API if RESEND_API_KEY is configured
 * 2. Nodemailer SMTP if SMTP_HOST is configured
 * 3. Local Console / Fallback if neither is configured (or in local dev)
 */
async function dispatchEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  if (emailFailureInjection) {
    return { success: false, error: "Injected email delivery failure" };
  }

  const { to, subject, html, text } = options;

  // 1. Resend API Provider
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: getFromEmail(),
        to,
        subject,
        html,
        text,
      });

      if (res.error) {
        console.error("[EMAIL:RESEND_ERROR]", res.error);
        return { success: false, error: res.error.message };
      }

      console.log(`[EMAIL:RESEND_SUCCESS] Sent to ${to} (ID: ${res.data?.id})`);
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[EMAIL:RESEND_EXCEPTION]", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // 2. SMTP Provider (Gmail, SendGrid, Amazon SES, Mailgun, etc.)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: getFromEmail(),
        to,
        subject,
        html,
        text,
      });

      console.log(`[EMAIL:SMTP_SUCCESS] Sent to ${to} (MsgId: ${info.messageId})`);
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[EMAIL:SMTP_EXCEPTION]", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // 3. Dev / Fallback Console Logger
  return { success: true };
}

export async function sendRejectionEmail(
  payload: RejectionEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  if (emailFailureInjection) {
    return { success: false, error: "Injected email delivery failure" };
  }

  const { to, customerName, orderId, eventName, reason } = payload;
  const rejectReason = reason || "สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรงกับคำสั่งซื้อ";

  const subject = `[TICKETBOX] แจ้งผลการตรวจสอบการชำระเงินไม่ผ่าน - คำสั่งซื้อ #${orderId}`;
  const text = `สวัสดีคุณ ${customerName},\n\nรายการคำสั่งซื้อ #${orderId} สำหรับงาน "${eventName}" ไม่ผ่านการตรวจสอบการชำระเงิน\nสาเหตุ: ${rejectReason}\n\nกรุณาติดต่อทีมงานผู้จัดหากมีข้อสงสัย`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
      <h2 style="color: #dc2626; margin-top: 0;">แจ้งเตือนผลการตรวจสอบการชำระเงิน</h2>
      <p>สวัสดีคุณ <strong>${customerName}</strong>,</p>
      <p>คำสั่งซื้อหมายเลข <strong>#${orderId}</strong> สำหรับงานแสดง <strong>"${eventName}"</strong> ไม่ผ่านการอนุมัติ</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
        <strong>สาเหตุ:</strong> ${rejectReason}
      </div>
      <p style="color: #666; font-size: 13px;">หากท่านโอนเงินถูกต้องเรียบร้อยแล้ว หรือมีข้อสงสัย กรุณาติดต่อผู้จัดงานพร้อมแนบหลักฐานการโอนเงิน</p>
    </div>
  `;

  console.log(
    `[EMAIL:REJECTION] To: ${to} | Customer: ${customerName} | Order: #${orderId} | Event: ${eventName} | Reason: ${rejectReason}`,
  );

  return dispatchEmail({ to, subject, html, text });
}

export async function sendTicketEmail(
  payload: TicketEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  if (emailFailureInjection) {
    return { success: false, error: "Injected email delivery failure" };
  }

  const { to, customerName, orderId, eventName, eventDate, startTime, venue, tickets, viewUrl } = payload;
  const fullViewUrl = `${getAppUrl()}${viewUrl}`;

  const subject = `[TICKETBOX] บัตรเข้างานของคุณพร้อมแล้ว! - ${eventName} (#${orderId})`;
  const text = `สวัสดีคุณ ${customerName},\n\nการชำระเงินสำหรับงาน "${eventName}" ได้รับการอนุมัติแล้ว!\nวันจัดงาน: ${eventDate} เวลา: ${startTime} น.\nสถานที่: ${venue}\nจำนวนบัตร: ${tickets.length} ใบ\n\nเปิดดูบัตรเข้างานและ QR Code ของคุณได้ที่: ${fullViewUrl}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="font-size: 20px; margin: 0; color: #000000; letter-spacing: -0.5px;">TICKETBOX</h1>
      </div>
      <h2 style="color: #16a34a; margin-top: 0;">การชำระเงินได้รับการอนุมัติเรียบร้อยแล้ว</h2>
      <p>สวัสดีคุณ <strong>${customerName}</strong>,</p>
      <p>ขอขอบคุณสำหรับการสั่งซื้อ บัตรเข้างานสำหรับ <strong>${eventName}</strong> ของคุณพร้อมใช้งานแล้ว</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>งานแสดง:</strong> ${eventName}</p>
        <p style="margin: 4px 0;"><strong>วันเวลา:</strong> ${eventDate} • ${startTime} น.</p>
        <p style="margin: 4px 0;"><strong>สถานที่:</strong> ${venue}</p>
        <p style="margin: 4px 0;"><strong>รหัสคำสั่งซื้อ:</strong> #${orderId}</p>
        <p style="margin: 4px 0;"><strong>จำนวนบัตร:</strong> ${tickets.length} ใบ</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${fullViewUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          เปิดดูบัตรเข้างาน & QR Code
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; text-align: center;">
        กรุณาเตรียมเปิด QR Code นี้แก่เจ้าหน้าที่ ณ จุดลงทะเบียนเข้างาน
      </p>
    </div>
  `;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n======================================================================\n` +
      `🎟️ [DEV EMAIL DISPATCH] จำลองการจัดส่งอีเมลตั๋วคอนเสิร์ตสำเร็จ!\n` +
      `ผู้รับ: ${to} (${customerName})\n` +
      `งาน: ${eventName} (ออเดอร์: #${orderId})\n` +
      `จำนวนตั๋ว: ${tickets.length} ใบ\n` +
      `👉 คลิกลิงก์เพื่อเปิดดูตั๋ว & QR Code ของลูกค้า:\n` +
      `   ${fullViewUrl}\n` +
      `======================================================================\n`,
    );
  } else {
    const sanitizedViewUrl = fullViewUrl.replace(/token=[a-zA-Z0-9_-]+/, "token=[REDACTED]");
    console.log(
      `[EMAIL:TICKETS] To: ${to} | Customer: ${customerName} | Order: #${orderId} | Event: ${eventName} | TicketsCount: ${tickets.length} | ViewLink: ${sanitizedViewUrl}`,
    );
  }

  return dispatchEmail({ to, subject, html, text });
}

export async function sendReissueTicketEmail(
  payload: ReissueTicketEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  if (emailFailureInjection) {
    return { success: false, error: "Injected email delivery failure" };
  }

  const { to, customerName, orderId, eventName, oldTicketNumber, newTicketNumber, viewUrl } = payload;
  const fullViewUrl = `${getAppUrl()}${viewUrl}`;

  const subject = `[TICKETBOX] แจ้งเตือนการยกเลิกและออกบัตรใหม่ทดแทน - ${eventName}`;
  const text = `สวัสดีคุณ ${customerName},\n\nระบบได้ทำการยกเลิกบัตรใบเดิม (${oldTicketNumber}) และออกบัตรใหม่ทดแทน (${newTicketNumber}) สำหรับงาน "${eventName}" เรียบร้อยแล้ว\n\nเปิดดูบัตรใบใหม่และ QR Code ได้ที่: ${fullViewUrl}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="font-size: 20px; margin: 0; color: #000000;">TICKETBOX SECURITY</h1>
      </div>
      <h2 style="color: #000000; margin-top: 0;">ออกบัตรใหม่ทดแทนสำเร็จ (Reissue Ticket)</h2>
      <p>สวัสดีคุณ <strong>${customerName}</strong>,</p>
      <p>ระบบได้ทำการยกเลิก QR Code ใบเดิมเพื่อความปลอดภัย และออกบัตรเข้างานใบใหม่ทดแทนสำหรับ <strong>${eventName}</strong></p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0; color: #ef4444;"><strong>❌ บัตรเดิมที่ถูกยกเลิก:</strong> ${oldTicketNumber} (สถานะ: CANCELLED ไม่สามารถสแกนได้)</p>
        <p style="margin: 4px 0; color: #16a34a;"><strong>✅ บัตรใหม่ที่ออกทดแทน:</strong> ${newTicketNumber} (สถานะ: OUTSIDE พร้อมใช้งาน)</p>
        <p style="margin: 4px 0;"><strong>รหัสคำสั่งซื้อ:</strong> #${orderId}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${fullViewUrl}" style="background-color: #000000; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          เปิดดูบัตรใหม่ & QR Code ทดแทน
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; text-align: center;">
        * QR Code เดิมจะไม่สามารถใช้สแกนผ่านประตูได้อีกต่อไป กรุณาแสดง QR Code จากบัตรใบใหม่นี้เท่านั้น
      </p>
    </div>
  `;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n======================================================================\n` +
      `🛡️ [DEV EMAIL DISPATCH] แจ้งเตือนการยกเลิกและออกบัตรใหม่ทดแทน (Reissue Ticket)!\n` +
      `ผู้รับ: ${to} (${customerName})\n` +
      `งาน: ${eventName} (ออเดอร์: #${orderId})\n` +
      `บัตรเดิมที่ถูกยกเลิก: ${oldTicketNumber} (สถานะ: CANCELLED ❌)\n` +
      `บัตรใหม่ที่ออกทดแทน: ${newTicketNumber} (สถานะ: OUTSIDE พร้อมใช้งาน ✅)\n` +
      `👉 คลิกลิงก์เพื่อเปิดดูตั๋ว & QR Code ใหม่:\n` +
      `   ${fullViewUrl}\n` +
      `======================================================================\n`,
    );
  } else {
    const sanitizedViewUrl = fullViewUrl.replace(/token=[a-zA-Z0-9_-]+/, "token=[REDACTED]");
    console.log(
      `[EMAIL:REISSUE] To: ${to} | Customer: ${customerName} | Order: #${orderId} | Event: ${eventName} | Cancelled: ${oldTicketNumber} | ReplacedWith: ${newTicketNumber} | ViewLink: ${sanitizedViewUrl}`,
    );
  }

  return dispatchEmail({ to, subject, html, text });
}
