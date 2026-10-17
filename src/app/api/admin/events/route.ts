import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { calculateAvailableTickets } from "@/lib/inventory";

export async function GET(request: Request) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const events = await prisma.event.findMany({
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { eventDate: "asc" },
    });

    const now = new Date();
    const eventSummaries = await Promise.all(
      events.map(async (event) => {
        const availableTickets = await calculateAvailableTickets(
          event.id,
          event.totalTickets,
          now,
        );
        return {
          id: event.id,
          name: event.name,
          category: event.category,
          description: event.description,
          venue: event.venue,
          eventDate: event.eventDate.toISOString().split("T")[0],
          startTime: event.startTime,
          ticketPrice: event.ticketPrice.toFixed(2),
          totalTickets: event.totalTickets,
          availableTickets,
          soldTickets: event.totalTickets - availableTickets,
          status: event.status,
          imageUrl: event.imageUrl,
          posterVerticalUrl: event.posterVerticalUrl || event.imageUrl,
          posterHorizontalUrl: event.posterHorizontalUrl || event.imageUrl,
          artists: event.artists || "",
          genre: event.genre || event.category,
          doorsOpenTime: event.doorsOpenTime || "",
          showStartTime: event.showStartTime || event.startTime,
          showEndTime: event.showEndTime || "",
          saleStartAt: event.saleStartAt ? event.saleStartAt.toISOString() : null,
          saleEndAt: event.saleEndAt ? event.saleEndAt.toISOString() : null,
          googleMapsUrl: event.googleMapsUrl || "",
          entryRules: event.entryRules || "",
          studentDiscountActive: event.studentDiscountActive,
          studentPrice: event.studentPrice ? Number(event.studentPrice) : null,
          organizer: event.organizer,
        };
      }),
    );

    return NextResponse.json({ events: eventSummaries }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงข้อมูลคอนเสิร์ตได้" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const {
      name,
      category,
      genre,
      artists,
      description,
      entryRules,
      venue,
      googleMapsUrl,
      eventDate,
      startTime,
      doorsOpenTime,
      showStartTime,
      showEndTime,
      saleStartAt,
      saleEndAt,
      ticketPrice,
      totalTickets,
      imageUrl,
      posterVerticalUrl,
      posterHorizontalUrl,
      studentDiscountActive,
      studentPrice,
      organizerId,
      status,
    } = body;

    if (
      !name ||
      !venue ||
      !eventDate ||
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

    const finalStartTime = (startTime || showStartTime || "19:00").trim();
    const vertUrl = (posterVerticalUrl || imageUrl || "/poster-summer.svg").trim();
    const horizUrl = (posterHorizontalUrl || imageUrl || vertUrl).trim();
    const studPriceNum = studentPrice !== undefined && studentPrice !== null && studentPrice !== "" ? parseFloat(studentPrice) : null;

    const createdEvent = await prisma.event.create({
      data: {
        name: name.trim(),
        category: (genre || category || "Concert").trim(),
        genre: (genre || category || "Concert").trim(),
        artists: (artists || "").trim(),
        description: (description || "").trim(),
        entryRules: (entryRules || "").trim(),
        venue: venue.trim(),
        googleMapsUrl: (googleMapsUrl || "").trim(),
        eventDate: new Date(eventDate),
        startTime: finalStartTime,
        doorsOpenTime: (doorsOpenTime || "").trim(),
        showStartTime: (showStartTime || finalStartTime).trim(),
        showEndTime: (showEndTime || "").trim(),
        saleStartAt: saleStartAt ? new Date(saleStartAt) : null,
        saleEndAt: saleEndAt ? new Date(saleEndAt) : null,
        ticketPrice: priceNum,
        totalTickets: ticketsNum,
        imageUrl: vertUrl,
        posterVerticalUrl: vertUrl,
        posterHorizontalUrl: horizUrl,
        studentDiscountActive: Boolean(studentDiscountActive),
        studentPrice: studPriceNum !== null && !isNaN(studPriceNum) ? studPriceNum : null,
        organizerId: organizer.id,
        status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      },
      include: {
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, event: createdEvent }, { status: 201 });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: { message: "ไม่สามารถสร้างคอนเสิร์ตได้ กรุณาลองใหม่อีกครั้ง" } },
      { status: 500 },
    );
  }
}
