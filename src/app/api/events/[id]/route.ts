import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAvailableTickets } from "@/lib/inventory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { name: true },
        },
      },
    });

    if (!event || event.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          error: {
            code: "EVENT_NOT_FOUND",
            message: "Event not found",
          },
        },
        { status: 404 },
      );
    }

    const availableQuantity = await calculateAvailableTickets(
      event.id,
      event.totalTickets,
      new Date(),
    );

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        category: event.category || "Concert",
        description: event.description,
        imageUrl: event.imageUrl,
        eventDate: event.eventDate.toISOString(),
        startTime: event.startTime,
        venue: event.venue,
        ticketPrice: event.ticketPrice.toFixed(2),
        totalTickets: event.totalTickets,
        availableQuantity,
        organizerName: event.organizer.name,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Event service is temporarily unavailable",
        },
      },
      { status: 503 },
    );
  }
}
