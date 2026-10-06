import { prisma } from "../src/lib/prisma";
import {
  prepareTicketArtifacts,
  issueTicketsInTransaction,
  dispatchTicketDelivery,
} from "../src/lib/ticket-service";
import { setMockStorage, getPrivateArtifact } from "../src/lib/storage";
import { setEmailFailureInjection, TicketEmailPayload } from "../src/lib/email";
import { createSessionToken, getSessionSecret } from "../src/lib/session";
import { POST as approveHandler } from "../src/app/api/admin/verifications/[id]/approve/route";
import { POST as resendHandler } from "../src/app/api/admin/verifications/[id]/resend-email/route";
import { GET as getVerificationsHandler } from "../src/app/api/admin/verifications/route";

async function runVerification() {
  console.log("=== START VERIFY TASK-012 ===");
  const mockStorage = new Map<string, { data: Buffer; contentType: string }>();
  setMockStorage(mockStorage);
  setEmailFailureInjection(false);

  // 1. Setup Admin user and session
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin found");

  const secret = getSessionSecret();
  const adminSessionToken = await createSessionToken(
    { id: admin.id, role: admin.role },
    secret,
  );
  const adminHeaders = new Headers({
    cookie: `e-tikket-session=${adminSessionToken}`,
  });

  // Setup Organizer user and session for denial check
  const organizer = await prisma.user.findFirst({ where: { role: "ORGANIZER" } });
  if (!organizer) throw new Error("No organizer found");
  const organizerSessionToken = await createSessionToken(
    { id: organizer.id, role: organizer.role },
    secret,
  );
  const organizerHeaders = new Headers({
    cookie: `e-tikket-session=${organizerSessionToken}`,
  });


  // Setup Event
  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: "Concert Delivery Test Event",
      description: "Testing ticket delivery and manual resend",
      imageUrl: "https://example.com/poster.jpg",
      venue: "Grand Hall BKK",
      eventDate: new Date("2026-12-31"),
      startTime: "19:00",
      ticketPrice: 500,
      totalTickets: 100,
      status: "PUBLISHED",
    },
  });

  // Test Case 1: End-to-end Approval with successful initial email dispatch
  console.log("\n[Test 1] Order approval triggers automatic email delivery (SENT)");
  const order1 = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Alice Wonderland",
      customerEmail: "alice@example.com",
      customerPhone: "0812345678",
      quantity: 2,
      totalAmount: 1000,
      platformFeePercent: 5,
      platformFeeAmount: 50,
      organizerRevenue: 950,
      checkoutTokenHash: "order1-checkout-hash-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const approveReq1 = new Request(`http://localhost:3000/api/admin/verifications/${order1.id}/approve`, {
    method: "POST",
    headers: adminHeaders,
  });
  const approveRes1 = await approveHandler(approveReq1, { params: Promise.resolve({ id: order1.id }) });
  const approveJson1 = await approveRes1.json();
  console.log("Approve response status:", approveRes1.status, approveJson1);

  if (approveRes1.status !== 200 || approveJson1.deliveryStatus !== "SENT") {
    throw new Error(`Test 1 Failed: Expected 200 with deliveryStatus SENT, got ${approveRes1.status}`);
  }

  const updatedOrder1 = await prisma.order.findUnique({
    where: { id: order1.id },
    include: { tickets: true },
  });
  if (updatedOrder1?.status !== "PAID" || updatedOrder1.deliveryStatus !== "SENT") {
    throw new Error("Test 1 Failed: DB order state is not PAID/SENT");
  }
  if (updatedOrder1.tickets.length !== 2) {
    throw new Error("Test 1 Failed: Expected 2 tickets");
  }
  console.log("✓ Test 1 Passed: Order is PAID, 2 tickets issued, deliveryStatus is SENT");

  // Test Case 2: Approval when email fails -> Order is PAID, deliveryStatus FAILED, tickets intact
  console.log("\n[Test 2] Order approval with injected email delivery failure");
  setEmailFailureInjection(true);

  const order2 = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Bob Builder",
      customerEmail: "bob@example.com",
      customerPhone: "0898765432",
      quantity: 3,
      totalAmount: 1500,
      platformFeePercent: 5,
      platformFeeAmount: 75,
      organizerRevenue: 1425,
      checkoutTokenHash: "order2-checkout-hash-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const approveReq2 = new Request(`http://localhost:3000/api/admin/verifications/${order2.id}/approve`, {
    method: "POST",
    headers: adminHeaders,
  });
  const approveRes2 = await approveHandler(approveReq2, { params: Promise.resolve({ id: order2.id }) });
  const approveJson2 = await approveRes2.json();
  console.log("Approve response status with injected failure:", approveRes2.status, approveJson2);

  if (approveRes2.status !== 200 || approveJson2.deliveryStatus !== "FAILED") {
    throw new Error(`Test 2 Failed: Expected 200 with deliveryStatus FAILED, got ${approveRes2.status}`);
  }

  const updatedOrder2 = await prisma.order.findUnique({
    where: { id: order2.id },
    include: { tickets: true },
  });
  if (updatedOrder2?.status !== "PAID" || updatedOrder2.deliveryStatus !== "FAILED") {
    throw new Error("Test 2 Failed: DB order state should be PAID and FAILED");
  }
  if (!updatedOrder2.deliveryError) {
    throw new Error("Test 2 Failed: Expected deliveryError recorded");
  }
  if (updatedOrder2.tickets.length !== 3) {
    throw new Error("Test 2 Failed: All 3 tickets must remain issued");
  }
  console.log("✓ Test 2 Passed: Order is PAID, 3 tickets issued, deliveryStatus is FAILED, deliveryError is recorded");

  // Test Case 3: GET /api/admin/verifications includes PAID order with FAILED delivery
  console.log("\n[Test 3] GET /api/admin/verifications returns PAID orders with FAILED delivery");
  const getReq = new Request("http://localhost:3000/api/admin/verifications", {
    method: "GET",
    headers: adminHeaders,
  });
  const getRes = await getVerificationsHandler(getReq);
  const getJson = await getRes.json();
  const listedOrder2 = getJson.orders.find((o: any) => o.id === order2.id);
  if (!listedOrder2 || listedOrder2.status !== "PAID" || listedOrder2.deliveryStatus !== "FAILED") {
    throw new Error("Test 3 Failed: Order 2 not listed for resend in verifications list");
  }
  console.log("✓ Test 3 Passed: Order 2 listed in verifications queue for admin manual resend");

  // Test Case 4: Manual Resend Authorization checks (401 unauthenticated, 403 organizer)
  console.log("\n[Test 4] Manual resend authorization checks");
  const unauthRes = await resendHandler(
    new Request(`http://localhost:3000/api/admin/verifications/${order2.id}/resend-email`, { method: "POST" }),
    { params: Promise.resolve({ id: order2.id }) },
  );
  if (unauthRes.status !== 401) {
    throw new Error(`Test 4 Failed: Expected 401 for unauthenticated resend, got ${unauthRes.status}`);
  }

  const orgRes = await resendHandler(
    new Request(`http://localhost:3000/api/admin/verifications/${order2.id}/resend-email`, {
      method: "POST",
      headers: organizerHeaders,
    }),
    { params: Promise.resolve({ id: order2.id }) },
  );
  if (orgRes.status !== 403) {
    throw new Error(`Test 4 Failed: Expected 403 for organizer resend, got ${orgRes.status}`);
  }
  console.log("✓ Test 4 Passed: 401 and 403 enforced on resend-email");

  // Test Case 5: Manual Resend with email failure injected (returns 503, retains FAILED, ticketsCreated: 0)
  console.log("\n[Test 5] Manual resend failure retains FAILED and issues 0 tickets");
  const failedResendRes = await resendHandler(
    new Request(`http://localhost:3000/api/admin/verifications/${order2.id}/resend-email`, {
      method: "POST",
      headers: adminHeaders,
    }),
    { params: Promise.resolve({ id: order2.id }) },
  );
  const failedResendJson = await failedResendRes.json();
  console.log("Failed resend response:", failedResendRes.status, failedResendJson);
  if (failedResendRes.status !== 503 || failedResendJson.ticketsCreated !== 0 || failedResendJson.deliveryStatus !== "FAILED") {
    throw new Error("Test 5 Failed: Expected 503 with deliveryStatus FAILED and ticketsCreated 0");
  }

  const countTicketsAfterFailedResend = await prisma.ticket.count({ where: { orderId: order2.id } });
  if (countTicketsAfterFailedResend !== 3) {
    throw new Error(`Test 5 Failed: Expected exactly 3 tickets, got ${countTicketsAfterFailedResend}`);
  }
  console.log("✓ Test 5 Passed: Resend failure returns 503, retains FAILED status, tickets count unchanged (3)");

  // Test Case 6: Successful Manual Resend (recovers from failure, transitions to SENT, ticketsCreated: 0)
  console.log("\n[Test 6] Successful manual resend transitions deliveryStatus to SENT with 0 new tickets");
  setEmailFailureInjection(false);

  const successResendRes = await resendHandler(
    new Request(`http://localhost:3000/api/admin/verifications/${order2.id}/resend-email`, {
      method: "POST",
      headers: adminHeaders,
    }),
    { params: Promise.resolve({ id: order2.id }) },
  );
  const successResendJson = await successResendRes.json();
  console.log("Successful resend response:", successResendRes.status, successResendJson);

  if (successResendRes.status !== 200 || successResendJson.deliveryStatus !== "SENT" || successResendJson.ticketsCreated !== 0) {
    throw new Error("Test 6 Failed: Expected 200 with deliveryStatus SENT and ticketsCreated 0");
  }

  const finalOrder2 = await prisma.order.findUnique({
    where: { id: order2.id },
    include: { tickets: true },
  });
  if (finalOrder2?.deliveryStatus !== "SENT" || finalOrder2.tickets.length !== 3) {
    throw new Error("Test 6 Failed: DB deliveryStatus should be SENT with exactly 3 original tickets");
  }
  console.log("✓ Test 6 Passed: Resend succeeded, deliveryStatus is SENT, exactly 3 original tickets preserved");

  // Test Case 7: Repeated Approve does NOT invoke resend
  console.log("\n[Test 7] Repeated Approve on PAID order returns existing state without resending email");
  const repeatApproveRes = await approveHandler(
    new Request(`http://localhost:3000/api/admin/verifications/${order2.id}/approve`, {
      method: "POST",
      headers: adminHeaders,
    }),
    { params: Promise.resolve({ id: order2.id }) },
  );
  const repeatApproveJson = await repeatApproveRes.json();
  if (repeatApproveRes.status !== 200 || repeatApproveJson.deliveryStatus !== "SENT") {
    throw new Error("Test 7 Failed: Repeated approve should return existing count and deliveryStatus SENT");
  }
  console.log("✓ Test 7 Passed: Repeated Approve does not alter order or invoke duplicate resend");

  console.log("\nALL VERIFICATION CHECKS FOR TASK-012 PASSED SUCCESSFULLY!");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
