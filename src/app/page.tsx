import { prisma } from "@/lib/prisma";
import { calculateAvailableTickets } from "@/lib/inventory";
import { HomePageClient } from "@/components/home-page-client";
import { CatalogEvent } from "@/components/event-catalog-browser";

async function getPublishedEvents(): Promise<{ events: CatalogEvent[]; error: boolean }> {
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        genre: true,
        description: true,
        imageUrl: true,
        posterVerticalUrl: true,
        posterHorizontalUrl: true,
        artists: true,
        doorsOpenTime: true,
        showStartTime: true,
        showEndTime: true,
        eventDate: true,
        startTime: true,
        venue: true,
        ticketPrice: true,
        totalTickets: true,
        googleMapsUrl: true,
        studentDiscountActive: true,
        studentPrice: true,
      },
    });

    const now = new Date();
    const list: CatalogEvent[] = [];
    for (const e of events) {
      const availableQuantity = await calculateAvailableTickets(e.id, e.totalTickets, now);
      list.push({
        id: e.id,
        name: e.name,
        category: e.category || "Concert",
        genre: e.genre,
        description: e.description,
        imageUrl: e.imageUrl,
        posterVerticalUrl: e.posterVerticalUrl,
        posterHorizontalUrl: e.posterHorizontalUrl,
        artists: e.artists,
        doorsOpenTime: e.doorsOpenTime,
        showStartTime: e.showStartTime,
        showEndTime: e.showEndTime,
        eventDate: e.eventDate.toISOString().split("T")[0],
        startTime: e.startTime,
        venue: e.venue,
        ticketPrice: e.ticketPrice.toFixed(2),
        availableQuantity,
        googleMapsUrl: e.googleMapsUrl,
        studentDiscountActive: e.studentDiscountActive,
        studentPrice: e.studentPrice ? e.studentPrice.toFixed(2) : null,
      });
    }

    return { events: list, error: false };
  } catch (err) {
    console.error("Failed to get published events:", err);
    return { events: [], error: true };
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { events, error } = await getPublishedEvents();

  return <HomePageClient events={events} error={error} />;
}
