import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAvailableTickets } from "@/lib/inventory";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        imageUrl: true,
        eventDate: true,
        startTime: true,
        venue: true,
        ticketPrice: true,
        totalTickets: true,
      },
    });

    const now = new Date();
    const eventSummaries = await Promise.all(
      events.map(async (event) => {
        const availableQuantity = await calculateAvailableTickets(
          event.id,
          event.totalTickets,
          now,
        );
        return {
          id: event.id,
          name: event.name,
          category: event.category || "Concert",
          imageUrl: event.imageUrl,
          eventDate: event.eventDate.toISOString(),
          startTime: event.startTime,
          venue: event.venue,
          ticketPrice: event.ticketPrice.toFixed(2),
          availableQuantity,
        };
      }),
    );

    return NextResponse.json({ events: eventSummaries });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Event catalog is temporarily unavailable",
        },
      },
      { status: 503 },
    );
  }
}
