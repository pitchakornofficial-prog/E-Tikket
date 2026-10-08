import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

export interface TicketPdfItem {
  ticketNumber: string;
  status: "OUTSIDE" | "INSIDE" | "CANCELLED";
  qrBuffer: Buffer;
}

export interface TicketPdfData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  event: {
    name: string;
    eventDate: string;
    startTime: string;
    venue: string;
    ticketPrice: string;
  };
  tickets: TicketPdfItem[];
}

export async function generateTicketsPdf(data: TicketPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regularFontPath = path.join(process.cwd(), "src/assets/fonts/Sarabun-Regular.ttf");
  const boldFontPath = path.join(process.cwd(), "src/assets/fonts/Sarabun-Bold.ttf");

  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(regularFontPath));
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(boldFontPath));

  const totalPages = data.tickets.length;

  for (let i = 0; i < data.tickets.length; i++) {
    const ticket = data.tickets[i];
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4
    const { width, height } = page.getSize();

    // Embed QR image
    const qrImage = await pdfDoc.embedPng(ticket.qrBuffer);

    // Outer framing box (Clean print ticket layout)
    const margin = 36;
    const contentWidth = width - margin * 2;
    const contentHeight = height - margin * 2;

    // Draw card border
    page.drawRectangle({
      x: margin,
      y: margin,
      width: contentWidth,
      height: contentHeight,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1.5,
      color: rgb(1, 1, 1),
    });

    let currentY = height - margin - 30;

    // 1. Header Bar: TICKETBOX branding
    page.drawRectangle({
      x: margin,
      y: currentY - 15,
      width: contentWidth,
      height: 45,
      color: rgb(0, 0, 0),
    });

    page.drawText("TICKETBOX", {
      x: margin + 20,
      y: currentY,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText("E-TICKET ENTRY PASS • บัตรเข้างาน", {
      x: width - margin - 220,
      y: currentY + 3,
      size: 11,
      font: fontRegular,
      color: rgb(0.9, 0.9, 0.9),
    });

    currentY -= 50;

    // Page indicator (e.g. Ticket 1 of 3)
    page.drawText(`บัตรใบที่ ${i + 1} จากทั้งหมด ${totalPages} ใบ`, {
      x: margin + 20,
      y: currentY,
      size: 11,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });

    currentY -= 35;

    // 2. Event Title & Details
    page.drawText(data.event.name, {
      x: margin + 20,
      y: currentY,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    currentY -= 28;

    page.drawText(`สถานที่ (Venue): ${data.event.venue}`, {
      x: margin + 20,
      y: currentY,
      size: 12,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });

    currentY -= 22;

    page.drawText(`วันที่: ${data.event.eventDate}    เวลา: ${data.event.startTime} น.    ราคา: ฿${data.event.ticketPrice}`, {
      x: margin + 20,
      y: currentY,
      size: 12,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });

    currentY -= 25;

    // Dashed Divider line
    page.drawLine({
      start: { x: margin + 15, y: currentY },
      end: { x: width - margin - 15, y: currentY },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
      dashArray: [4, 4],
    });

    currentY -= 25;

    // 3. Attendee & Order Information
    page.drawText(`ผู้ซื้อ: ${data.customerName} (${data.customerEmail})`, {
      x: margin + 20,
      y: currentY,
      size: 12,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });

    currentY -= 24;

    page.drawText(`รหัสคำสั่งซื้อ (Order ID): #${data.orderId}`, {
      x: margin + 20,
      y: currentY,
      size: 11,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    currentY -= 30;

    // 4. Ticket Number & Status Box
    page.drawRectangle({
      x: margin + 20,
      y: currentY - 12,
      width: contentWidth - 40,
      height: 38,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    page.drawText(`เลขที่บัตร (Ticket No.):`, {
      x: margin + 35,
      y: currentY,
      size: 12,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(ticket.ticketNumber, {
      x: margin + 180,
      y: currentY,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // Cancelled warning or Status badge
    if (ticket.status === "CANCELLED") {
      page.drawText("STATUS: CANCELLED (บัตรถูกยกเลิก)", {
        x: width - margin - 230,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.8, 0.1, 0.1),
      });
    } else {
      page.drawText(`STATUS: ${ticket.status}`, {
        x: width - margin - 160,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.5, 0.2),
      });
    }

    currentY -= 50;

    // 5. Scannable QR Code
    const qrSize = 190;
    const qrX = (width - qrSize) / 2;

    // Cancelled Watermark or Warning Banner
    if (ticket.status === "CANCELLED") {
      page.drawRectangle({
        x: qrX - 20,
        y: currentY - qrSize - 40,
        width: qrSize + 40,
        height: 25,
        color: rgb(0.95, 0.85, 0.85),
        borderColor: rgb(0.8, 0.2, 0.2),
        borderWidth: 1,
      });

      page.drawText("บัตรนี้ถูกยกเลิกแล้ว ไม่สามารถใช้เข้างานได้", {
        x: qrX - 5,
        y: currentY - qrSize - 33,
        size: 10,
        font: fontBold,
        color: rgb(0.8, 0.1, 0.1),
      });
    }

    // QR Code Frame
    page.drawRectangle({
      x: qrX - 10,
      y: currentY - qrSize - 10,
      width: qrSize + 20,
      height: qrSize + 20,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: currentY - qrSize,
      width: qrSize,
      height: qrSize,
    });

    currentY -= qrSize + 35;

    page.drawText("กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่ที่จุดลงทะเบียนเข้างาน", {
      x: (width - fontRegular.widthOfTextAtSize("กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่ที่จุดลงทะเบียนเข้างาน", 11)) / 2,
      y: currentY,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 20;

    page.drawText("ปรับความสว่างหน้าจอสูงสุด หรือพิมพ์บัตรนี้ลงบนกระดาษเพื่อความสะดวกในการสแกน", {
      x: (width - fontRegular.widthOfTextAtSize("ปรับความสว่างหน้าจอสูงสุด หรือพิมพ์บัตรนี้ลงบนกระดาษเพื่อความสะดวกในการสแกน", 10)) / 2,
      y: currentY,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // 6. Security & Policy Footer
    const footerY = margin + 25;
    page.drawLine({
      start: { x: margin + 15, y: footerY + 20 },
      end: { x: width - margin - 15, y: footerY + 20 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText("TICKETBOX SECURE QR VERIFICATION • RE-ENTRY SUPPORTED • DO NOT DUPLICATE", {
      x: (width - fontBold.widthOfTextAtSize("TICKETBOX SECURE QR VERIFICATION • RE-ENTRY SUPPORTED • DO NOT DUPLICATE", 8)) / 2,
      y: footerY + 6,
      size: 8,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText("บัตรนี้เข้ารหัสลับป้องกันการปลอมแปลง หากมีข้อสงสัยกรุณาติดต่อผู้จัดงาน", {
      x: (width - fontRegular.widthOfTextAtSize("บัตรนี้เข้ารหัสลับป้องกันการปลอมแปลง หากมีข้อสงสัยกรุณาติดต่อผู้จัดงาน", 8)) / 2,
      y: footerY - 6,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return pdfDoc.save();
}
