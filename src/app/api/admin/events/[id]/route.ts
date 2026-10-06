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
