export interface RejectionEmailPayload {
  to: string;
  customerName: string;
  orderId: string;
  eventName: string;
  reason?: string | null;
}

export interface TicketEmailPayload {
  to: string;
  customerName: string;
  orderId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  venue: string;
  tickets: Array<{
    ticketNumber: string;
    qrDataUrl: string;
  }>;
  viewUrl: string;
}

let emailFailureInjection = false;

export function setEmailFailureInjection(fail: boolean) {
  emailFailureInjection = fail;
}

export async function sendRejectionEmail(
  payload: RejectionEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  if (emailFailureInjection) {
    return { success: false, error: "Injected email delivery failure" };
  }

  const { to, customerName, orderId, eventName, reason } = payload;

  // Development / Console transport
  console.log(
    `[EMAIL:REJECTION] To: ${to} | Customer: ${customerName} | Order: #${orderId} | Event: ${eventName} | Reason: ${
      reason || "สลิปไม่ถูกต้อง หรือยอดเงินไม่ตรง"
    }`,
  );

  return { success: true };
}

export async function sendTicketEmail(
  payload: TicketEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  if (emailFailureInjection) {
    return { success: false, error: "Injected email delivery failure" };
  }

  const { to, customerName, orderId, eventName, tickets, viewUrl } = payload;

  // Redact viewToken parameter in ordinary console log
  const sanitizedViewUrl = viewUrl.replace(/token=[a-zA-Z0-9_-]+/, "token=[REDACTED]");

  console.log(
    `[EMAIL:TICKETS] To: ${to} | Customer: ${customerName} | Order: #${orderId} | Event: ${eventName} | TicketsCount: ${tickets.length} | ViewLink: ${sanitizedViewUrl}`,
  );

  return { success: true };
}

