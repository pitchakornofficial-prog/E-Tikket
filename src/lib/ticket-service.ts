import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { generateSecureToken, hashToken } from "./crypto";
import { putPrivateArtifact, getPrivateArtifact, deletePrivateArtifacts } from "./storage";
import { sendTicketEmail } from "./email";

export interface PreparedTicketItem {
  ticketNumber: string;
  qrSecret: string;
  qrTokenHash: string;
  qrArtifactKey: string;
}

export interface PreparedIssuance {
  orderId: string;
  eventId: string;
  viewToken: string;
  viewTokenHash: string;
  deliveryArtifactKey: string;
  tickets: PreparedTicketItem[];
  allArtifactKeys: string[];
}

export class IssuancePreparationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "IssuancePreparationError";
  }
}

/**
 * Prepares CSPRNG secrets, QR code images, view capabilities, and delivery payload.
 * Uploads private artifacts to Cloudflare R2 before committing the database transaction.
 * If preparation fails, cleanly deletes any uploaded artifacts.
 */
export async function prepareTicketArtifacts(
  orderId: string,
  eventId: string,
  quantity: number,
): Promise<PreparedIssuance> {
  const allArtifactKeys: string[] = [];
  const tickets: PreparedTicketItem[] = [];

  try {
    // 1. Generate view capability for email access
    const viewToken = generateSecureToken(32);
    const viewTokenHash = hashToken(viewToken);

    // 2. Generate each ticket's CSPRNG QR secret and render QR image
    const shortOrderId = orderId.slice(-6).toUpperCase();

    for (let i = 1; i <= quantity; i++) {
      const ticketNumber = `TK-${shortOrderId}-${String(i).padStart(2, "0")}`;
      const qrSecret = generateSecureToken(32);
      const qrTokenHash = hashToken(qrSecret);

      // Render QR code to PNG buffer (high-contrast, readable)
      const qrBuffer = await QRCode.toBuffer(qrSecret, {
        type: "png",
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      const qrArtifactKey = `tickets/${orderId}/${ticketNumber}-${generateSecureToken(8)}.png`;
      await putPrivateArtifact(qrArtifactKey, qrBuffer, "image/png");
      allArtifactKeys.push(qrArtifactKey);

      tickets.push({
        ticketNumber,
        qrSecret,
        qrTokenHash,
        qrArtifactKey,
      });
    }

    // 3. Prepare private delivery payload for email dispatch and manual resend
    const deliveryPayload = {
      orderId,
      eventId,
      viewToken,
      viewUrl: `/tickets?token=${viewToken}`,
      preparedAt: new Date().toISOString(),
      tickets: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        qrArtifactKey: t.qrArtifactKey,
      })),
    };

    const deliveryPayloadBuffer = Buffer.from(JSON.stringify(deliveryPayload), "utf-8");
    const deliveryArtifactKey = `delivery/${orderId}/payload-${Date.now()}-${generateSecureToken(8)}.json`;
    await putPrivateArtifact(deliveryArtifactKey, deliveryPayloadBuffer, "application/json");
    allArtifactKeys.push(deliveryArtifactKey);

    return {
      orderId,
      eventId,
      viewToken,
      viewTokenHash,
      deliveryArtifactKey,
      tickets,
      allArtifactKeys,
    };
  } catch (error) {
    // Best-effort cleanup of any artifacts uploaded before the error
    if (allArtifactKeys.length > 0) {
      try {
        await deletePrivateArtifacts(allArtifactKeys);
      } catch {
        // Ignore cleanup error
      }
    }
    throw new IssuancePreparationError("Failed to prepare ticket artifacts", error);
  }
}

/**
 * Commits ticket issuance and order PAID state inside an atomic Prisma transaction.
 * Designed to be reusable by future automated payment gateways.
 */
export async function issueTicketsInTransaction(
  tx: Prisma.TransactionClient,
  prepared: PreparedIssuance,
  reviewerId: string,
  now: Date = new Date(),
) {
  const { orderId, eventId, viewTokenHash, deliveryArtifactKey, tickets } = prepared;

  // 1. Update latest payment to APPROVED
  const latestPayment = await tx.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  if (latestPayment) {
    await tx.payment.update({
      where: { id: latestPayment.id },
      data: {
        status: "APPROVED",
        verifiedById: reviewerId,
        verifiedAt: now,
      },
    });
  } else {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (order) {
      await tx.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          slipUrl: "",
          slipHash: `manual-approve-${orderId}-${now.getTime()}`,
          status: "APPROVED",
          verifiedById: reviewerId,
          verifiedAt: now,
        },
      });
    }
  }

  // 2. Transition Order to PAID with view capability and delivery state
  await tx.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      viewTokenHash,
      deliveryStatus: "PENDING",
      deliveryArtifactKey,
    },
  });

  // 3. Create Ticket rows
  for (const t of tickets) {
    await tx.ticket.create({
      data: {
        eventId,
        orderId,
        ticketNumber: t.ticketNumber,
        qrTokenHash: t.qrTokenHash,
        qrArtifactKey: t.qrArtifactKey,
        status: "OUTSIDE",
      },
    });
  }
}


// Process-local lock for serializing overlapping delivery attempts per order
const activeDeliveryAttempts = new Set<string>();

export interface StoredDeliveryPayload {

  orderId: string;
  eventId: string;
  viewToken: string;
  viewUrl: string;
  preparedAt: string;
  tickets: Array<{
    ticketNumber: string;
    qrArtifactKey: string;
  }>;
}

export class DeliveryInProgressError extends Error {
  constructor(message = "Delivery is currently in progress") {
    super(message);
    this.name = "DeliveryInProgressError";
  }
}

/**
 * Dispatches ticket email using the private delivery payload and original QR artifacts.
 * Updates order deliveryStatus to SENT or FAILED, recording deliveryLastAttempt and sanitized deliveryError.
 * Interruption or email failure never rolls back PAID or tickets.
 */
export async function dispatchTicketDelivery(
  orderId: string,
  prismaClient: typeof prisma,
): Promise<{ success: boolean; deliveryStatus: "SENT" | "FAILED"; error?: string }> {
  if (activeDeliveryAttempts.has(orderId)) {
    throw new DeliveryInProgressError(`Delivery attempt already in progress for order ${orderId}`);
  }

  activeDeliveryAttempts.add(orderId);

  try {
    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (!order.deliveryArtifactKey) {
      throw new Error("MISSING_DELIVERY_PAYLOAD");
    }

    // 1. Retrieve the private delivery payload
    const payloadArtifact = await getPrivateArtifact(order.deliveryArtifactKey);
    if (!payloadArtifact) {
      throw new Error("DELIVERY_PAYLOAD_NOT_FOUND");
    }

    const payload: StoredDeliveryPayload = JSON.parse(
      payloadArtifact.data.toString("utf-8"),
    );

    // 2. Retrieve original QR code artifacts for each ticket
    const ticketEmailItems: Array<{ ticketNumber: string; qrDataUrl: string }> = [];
    for (const ticketItem of payload.tickets) {
      const qrArtifact = await getPrivateArtifact(ticketItem.qrArtifactKey);
      if (!qrArtifact) {
        throw new Error(`QR_ARTIFACT_NOT_FOUND:${ticketItem.ticketNumber}`);
      }
      ticketEmailItems.push({
        ticketNumber: ticketItem.ticketNumber,
        qrDataUrl: `data:${qrArtifact.contentType};base64,${qrArtifact.data.toString("base64")}`,
      });
    }

    // 3. Format event details
    const eventDateStr = order.event.eventDate.toISOString().split("T")[0];

    // 4. Send email via hybrid transport
    const emailResult = await sendTicketEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderId: order.id,
      eventName: order.event.name,
      eventDate: eventDateStr,
      startTime: order.event.startTime,
      venue: order.event.venue,
      tickets: ticketEmailItems,
      viewUrl: payload.viewUrl,
    });

    const now = new Date();

    if (emailResult.success) {
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          deliveryStatus: "SENT",
          deliveryLastAttempt: now,
          deliveryError: null,
        },
      });

      return { success: true, deliveryStatus: "SENT" };
    } else {
      const sanitizedError = emailResult.error || "Email transport error";
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          deliveryStatus: "FAILED",
          deliveryLastAttempt: now,
          deliveryError: sanitizedError.slice(0, 500),
        },
      });

      return { success: false, deliveryStatus: "FAILED", error: sanitizedError };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Delivery dispatch failed";
    try {
      await prismaClient.order.update({
        where: { id: orderId },
        data: {
          deliveryStatus: "FAILED",
          deliveryLastAttempt: new Date(),
          deliveryError: errorMsg.slice(0, 500),
        },
      });
    } catch {
      // Ignore secondary update error
    }
    return { success: false, deliveryStatus: "FAILED", error: errorMsg };
  } finally {
    activeDeliveryAttempts.delete(orderId);
  }
}
