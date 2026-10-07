import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const ticketNumber = searchParams.get("ticketNumber")?.trim();

  if (!email && !ticketNumber) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "กรุณาระบุอีเมลหรือเลขที่บัตร",
        },
      },
      { status: 400 },
    );
  }

  try {
    if (ticketNumber) {
      // Look up ticket by exact match (case-insensitive)
      const ticket = await prisma.ticket.findFirst({
        where: {
          ticketNumber: {
            equals: ticketNumber,
            mode: "insensitive",
          },
        },
        include: {
          order: {
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  eventDate: true,
                  startTime: true,
                  venue: true,
                  imageUrl: true,
                },
              },
              tickets: {
                select: {
                  id: true,
                  ticketNumber: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json(
          {
            error: {
              code: "TICKET_NOT_FOUND",
              message: "ไม่พบบัตรที่ตรงกับเลขที่นี้",
            },
          },
          { status: 404 },
        );
      }

      const order = ticket.order;
      const result = {
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        quantity: order.quantity,
        totalAmount: order.totalAmount.toFixed(2),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        event: {
          id: order.event.id,
          name: order.event.name,
          category: order.event.category,
          eventDate: order.event.eventDate.toISOString().split("T")[0],
          startTime: order.event.startTime,
          venue: order.event.venue,
          imageUrl: order.event.imageUrl,
        },
        tickets: order.tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          status: t.status,
        })),
      };

      const response = NextResponse.json({ orders: [result] }, { status: 200 });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_EMAIL",
              message: "กรุณาระบุอีเมลที่ถูกต้อง",
            },
          },
          { status: 400 },
        );
      }

      const orders = await prisma.order.findMany({
        where: {
          customerEmail: { equals: email, mode: "insensitive" },
          status: { in: ["PAID", "WAITING_FOR_VERIFY", "REJECTED", "PENDING_PAYMENT"] },
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              category: true,
              eventDate: true,
              startTime: true,
              venue: true,
              imageUrl: true,
            },
          },
          tickets: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const results = orders.map((order) => ({
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        quantity: order.quantity,
        totalAmount: order.totalAmount.toFixed(2),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        event: {
          id: order.event.id,
          name: order.event.name,
          category: order.event.category,
          eventDate: order.event.eventDate.toISOString().split("T")[0],
          startTime: order.event.startTime,
          venue: order.event.venue,
          imageUrl: order.event.imageUrl,
        },
        tickets: order.tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          status: t.status,
        })),
      }));

      const response = NextResponse.json({ orders: results }, { status: 200 });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "กรุณาระบุอีเมลหรือเลขที่บัตร",
        },
      },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_ERROR",
          message: "ไม่สามารถค้นหาข้อมูลตั๋วได้ในขณะนี้",
        },
      },
      { status: 500 },
    );
  }
}
