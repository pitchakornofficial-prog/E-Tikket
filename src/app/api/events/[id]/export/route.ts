import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { generateCSV, createCSVDownloadResponse } from "@/lib/csv";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  // 1. Auth check: ADMIN or ORGANIZER
  const auth = await requireStaff(request, ["ADMIN", "ORGANIZER"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const url = new URL(request.url);
  const exportType = url.searchParams.get("type") || "attendees";

  try {
    // 2. Fetch event
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            tickets: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
              },
            },
          },
        },
        tickets: {
          orderBy: { ticketNumber: "asc" },
          include: {
            order: {
              select: {
                id: true,
                customerName: true,
                customerEmail: true,
                customerPhone: true,
                quantity: true,
                totalAmount: true,
                status: true,
                createdAt: true,
              },
            },
            scans: {
              orderBy: { scannedAt: "desc" },
              take: 1,
              select: {
                scannedAt: true,
                action: true,
                result: true,
                checkerName: true,
                staff: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "ไม่พบข้อมูลคอนเสิร์ต" }, { status: 404 });
    }

    // 3. Authorization guard: Organizer can only export their own events
    if (auth.session.role === "ORGANIZER" && event.organizerId !== auth.session.sub) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึงหรือส่งออกข้อมูลคอนเสิร์ตนี้" },
        { status: 403 }
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const cleanEventName = event.name.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_");

    // Format Date helper
    const formatDateTime = (date: Date) => {
      try {
        return new Date(date).toLocaleString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } catch {
        return date.toISOString();
      }
    };

    // 4. Generate CSV depending on exportType
    if (exportType === "orders") {
      const headers = [
        "ลำดับ",
        "รหัสคำสั่งซื้อ",
        "วันเวลาสั่งซื้อ",
        "ชื่อผู้ซื้อ",
        "อีเมล",
        "เบอร์โทรศัพท์",
        "จำนวนบัตร",
        "ยอดชำระรวม (บาท)",
        "ค่าธรรมเนียมระบบ (บาท)",
        "รายได้สุทธิผู้จัด (บาท)",
        "สถานะคำสั่งซื้อ",
        "เลขที่บัตรทั้งหมด",
      ];

      const rows = event.orders.map((order, idx) => {
        const ticketNumbers = order.tickets.map((t) => t.ticketNumber).join(", ");
        const statusText =
          order.status === "PAID"
            ? "ชำระเงินสำเร็จ (PAID)"
            : order.status === "WAITING_FOR_VERIFY"
            ? "รอตรวจสอบสลิป (WAITING_FOR_VERIFY)"
            : order.status === "PENDING_PAYMENT"
            ? "รอชำระเงิน (PENDING_PAYMENT)"
            : order.status === "EXPIRED"
            ? "หมดอายุ (EXPIRED)"
            : order.status === "REJECTED"
            ? "ปฏิเสธสลิป (REJECTED)"
            : "ยกเลิก (CANCELLED)";

        return [
          idx + 1,
          order.id,
          formatDateTime(order.createdAt),
          order.customerName,
          order.customerEmail,
          order.customerPhone,
          order.quantity,
          Number(order.totalAmount).toFixed(2),
          Number(order.platformFeeAmount).toFixed(2),
          Number(order.organizerRevenue).toFixed(2),
          statusText,
          ticketNumbers || "-",
        ];
      });

      const csvContent = generateCSV(headers, rows);
      const filename = `${cleanEventName}_orders_${todayStr}.csv`;
      return createCSVDownloadResponse(csvContent, filename);
    }

    // Default: attendees list (per-ticket check-in sheet)
    const headers = [
      "ลำดับ",
      "เลขที่บัตร",
      "สถานะบัตร",
      "ชื่อผู้เข้างาน / ผู้ซื้อ",
      "อีเมล",
      "เบอร์โทรศัพท์",
      "รหัสคำสั่งซื้อ",
      "วันเวลาสั่งซื้อ",
      "การสแกนล่าสุด",
      "เวลาสแกนล่าสุด",
      "เจ้าหน้าที่ผู้ตรวจล่าสุด",
    ];

    const rows = event.tickets.map((ticket, idx) => {
      const ticketStatusText =
        ticket.status === "INSIDE"
          ? "เข้างานแล้ว (INSIDE)"
          : ticket.status === "OUTSIDE"
          ? "ยังไม่เข้างาน (OUTSIDE)"
          : "ยกเลิก (CANCELLED)";

      const lastScan = ticket.scans[0] || null;
      const lastScanAction = lastScan
        ? lastScan.action === "CHECK_IN"
          ? "เข้างาน (CHECK_IN)"
          : "ออกชั่วคราว (CHECK_OUT)"
        : "-";
      const lastScanTime = lastScan ? formatDateTime(lastScan.scannedAt) : "-";
      const lastScanStaff = lastScan
        ? lastScan.checkerName || lastScan.staff?.name || "Staff"
        : "-";

      return [
        idx + 1,
        ticket.ticketNumber,
        ticketStatusText,
        ticket.order.customerName,
        ticket.order.customerEmail,
        ticket.order.customerPhone,
        ticket.order.id,
        formatDateTime(ticket.order.createdAt),
        lastScanAction,
        lastScanTime,
        lastScanStaff,
      ];
    });

    const csvContent = generateCSV(headers, rows);
    const filename = `${cleanEventName}_attendees_${todayStr}.csv`;
    return createCSVDownloadResponse(csvContent, filename);
  } catch (err) {
    console.error("Failed to export event CSV:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างไฟล์ CSV" },
      { status: 500 }
    );
  }
}
