import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  // 1. Authorize ADMIN role
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: { message: "ไม่พบคอนเสิร์ตที่ต้องการแก้ไข" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      venue,
      eventDate,
      startTime,
      ticketPrice,
      totalTickets,
      imageUrl,
      organizerId,
      status,
    } = body;

    if (
      !name ||
      !venue ||
      !eventDate ||
      !startTime ||
      ticketPrice === undefined ||
      totalTickets === undefined ||
      !organizerId
    ) {
      return NextResponse.json(
        { error: { message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" } },
        { status: 400 },
      );
    }

    // Verify organizer exists and has ORGANIZER role
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
    });

    if (!organizer || organizer.role !== "ORGANIZER") {
      return NextResponse.json(
        { error: { message: "ไม่พบผู้จัดงานที่ระบุ หรือผู้ใช้ไม่มีสิทธิ์เป็นผู้จัดงาน" } },
        { status: 400 },
      );
    }

    const priceNum = parseFloat(ticketPrice);
    const ticketsNum = parseInt(totalTickets, 10);

    if (isNaN(priceNum) || priceNum < 0 || isNaN(ticketsNum) || ticketsNum <= 0) {
      return NextResponse.json(
        { error: { message: "ราคาบัตรและจำนวนบัตรต้องเป็นตัวเลขที่ถูกต้อง" } },
        { status: 400 },
      );
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        name: name.trim(),
        category: (category || "Concert").trim(),
        description: (description || "").trim(),
        venue: venue.trim(),
        eventDate: new Date(eventDate),
        startTime: startTime.trim(),
        ticketPrice: priceNum,
        totalTickets: ticketsNum,
        imageUrl: (imageUrl || "/poster-summer.svg").trim(),
        organizerId: organizer.id,
        status: status === "PUBLISHED" ? "PUBLISHED" : status === "ARCHIVED" ? "ARCHIVED" : "DRAFT",
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, event: updatedEvent }, { status: 200 });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถบันทึกการแก้ไขคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  // 1. Authorize ADMIN role
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: { message: "ไม่พบคอนเสิร์ตที่ระบุ" } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { error: { message: "สถานะไม่ถูกต้อง (ต้องเป็น PUBLISHED, DRAFT หรือ ARCHIVED)" } },
        { status: 400 },
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, event: updatedEvent, message: status === "ARCHIVED" ? "จัดเก็บคอนเสิร์ตเรียบร้อยแล้ว" : "อัปเดตสถานะคอนเสิร์ตเรียบร้อยแล้ว" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to patch event status:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถเปลี่ยนสถานะคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  // 1. Authorize ADMIN role
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: { message: "ไม่พบคอนเสิร์ตที่ต้องการลบ" } },
        { status: 404 },
      );
    }

    // Check if event has associated orders or tickets
    const orderCount = await prisma.order.count({
      where: { eventId: id },
    });
    const ticketCount = await prisma.ticket.count({
      where: { eventId: id },
    });

    if (orderCount > 0 || ticketCount > 0) {
      return NextResponse.json(
        {
          error: {
            message: `ไม่สามารถลบคอนเสิร์ต "${existingEvent.name}" ได้ เนื่องจากมีคำสั่งซื้อหรือตั๋วที่ออกไปแล้ว (${orderCount} คำสั่งซื้อ, ${ticketCount} ใบ) กรุณาใช้การ "จัดเก็บ (Archive)" แทน เพื่อรักษาประวัติข้อมูล`,
            canArchive: true,
          },
        },
        { status: 400 },
      );
    }

    // Delete scans if any
    await prisma.ticketScan.deleteMany({
      where: { eventId: id },
    });

    // Delete the event
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: `ลบคอนเสิร์ต "${existingEvent.name}" ออกจากระบบเรียบร้อยแล้ว` },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถลบคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
