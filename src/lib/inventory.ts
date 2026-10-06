import { prisma } from "./prisma";

/**
 * Calculates remaining available tickets for an event according to the canonical inventory rule:
 * Consumed tickets = sum of quantities of:
 * 1. PAID orders
 * 2. WAITING_FOR_VERIFY orders
 * 3. PENDING_PAYMENT orders where expiresAt > current time
 *
 * Orders with status EXPIRED, REJECTED, or CANCELLED do not consume inventory.
 */
export async function calculateAvailableTickets(
  eventId: string,
  totalTickets: number,
  now = new Date(),
): Promise<number> {
  const activeOrders = await prisma.order.findMany({
    where: {
      eventId,
      OR: [
        { status: "PAID" },
        { status: "WAITING_FOR_VERIFY" },
        {
          status: "PENDING_PAYMENT",
          expiresAt: { gt: now },
        },
      ],
    },
    select: { quantity: true },
  });

  const consumed = activeOrders.reduce((sum, o) => sum + o.quantity, 0);
  return Math.max(0, totalTickets - consumed);
}
