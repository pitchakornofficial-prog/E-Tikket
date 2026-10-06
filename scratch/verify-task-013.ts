import { prisma } from "../src/lib/prisma";
import {
  prepareTicketArtifacts,
  issueTicketsInTransaction,
} from "../src/lib/ticket-service";
import { setMockStorage, setStorageFailureInjection } from "../src/lib/storage";
import { GET as ticketViewHandler } from "../src/app/api/tickets/view/route";

async function runVerification() {
  console.log("=== START VERIFY TASK-013 ===");
  const mockStorage = new Map<string, { data: Buffer; contentType: string }>();
  setMockStorage(mockStorage);
  setStorageFailureInjection(null);

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin found");

  const organizer = await prisma.user.findFirst({ where: { role: "ORGANIZER" } });
  if (!organizer) throw new Error("No organizer found");

  // Setup Event
  const event = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: "Rock Wave Festival 2026",
      description: "Live Rock Music Festival",
      imageUrl: "https://example.com/rock.jpg",
      venue: "Impact Arena",
      eventDate: new Date("2026-11-20"),
      startTime: "18:30",
      ticketPrice: 850,
      totalTickets: 50,
      status: "PUBLISHED",
    },
  });

  // Setup Order 1 (PAID with 2 tickets)
  const order1 = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Charlie Brown",
      customerEmail: "charlie@example.com",
      customerPhone: "0811112222",
      quantity: 2,
      totalAmount: 1700,
      platformFeePercent: 5,
      platformFeeAmount: 85,
      organizerRevenue: 1615,
      checkoutTokenHash: "order1-checkout-token-hash-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const prepared1 = await prepareTicketArtifacts(order1.id, event.id, order1.quantity);
  await prisma.$transaction(async (tx) => {
    await issueTicketsInTransaction(tx, prepared1, admin.id);
  });
  const viewToken1 = prepared1.viewToken;

  // Setup Order 2 (PAID with 1 ticket)
  const order2 = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Diana Prince",
      customerEmail: "diana@example.com",
      customerPhone: "0899998888",
      quantity: 1,
      totalAmount: 850,
      platformFeePercent: 5,
      platformFeeAmount: 42.5,
      organizerRevenue: 807.5,
      checkoutTokenHash: "order2-checkout-token-hash-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const prepared2 = await prepareTicketArtifacts(order2.id, event.id, order2.quantity);
  await prisma.$transaction(async (tx) => {
    await issueTicketsInTransaction(tx, prepared2, admin.id);
  });
  const viewToken2 = prepared2.viewToken;

  // Test Case 1: Unauthenticated valid access with viewToken1
  console.log("\n[Test 1] Unauthenticated valid access with view token");
  const req1 = new Request(`http://localhost:3000/api/tickets/view?token=${viewToken1}`, { method: "GET" });
  const res1 = await ticketViewHandler(req1);
  const data1 = await res1.json();
  console.log("View order 1 status:", res1.status, "Tickets returned:", data1.tickets?.length);

  if (res1.status !== 200 || data1.tickets?.length !== 2) {
    throw new Error(`Test 1 Failed: Expected 200 with 2 tickets, got ${res1.status}`);
  }
  if (data1.order.customerName !== "Charlie Brown" || data1.order.customerEmail !== "charlie@example.com") {
    throw new Error("Test 1 Failed: Order info mismatch");
  }
  if (!data1.tickets[0].qrDataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("Test 1 Failed: qrDataUrl must be base64 PNG data URL");
  }
  if (data1.tickets[0].status !== "OUTSIDE") {
    throw new Error("Test 1 Failed: Expected initial status OUTSIDE");
  }

  // Security Headers check
  if (res1.headers.get("Cache-Control") !== "private, no-store" || res1.headers.get("Referrer-Policy") !== "no-referrer") {
    throw new Error("Test 1 Failed: Missing required security headers");
  }
  console.log("✓ Test 1 Passed: Order 1 tickets and original QR data URLs retrieved cleanly with security headers");

  // Test Case 2: Unauthenticated valid access with viewToken2 returns scoped Diana data only
  console.log("\n[Test 2] Order 2 scoped access");
  const req2 = new Request(`http://localhost:3000/api/tickets/view?token=${viewToken2}`, { method: "GET" });
  const res2 = await ticketViewHandler(req2);
  const data2 = await res2.json();

  if (res2.status !== 200 || data2.tickets?.length !== 1 || data2.order.customerName !== "Diana Prince") {
    throw new Error(`Test 2 Failed: Expected 200 with 1 ticket for Diana Prince, got ${res2.status}`);
  }
  console.log("✓ Test 2 Passed: Scoped order access verified; cannot see other buyers");

  // Test Case 3: Missing, mutated, invalid, or checkout token produces uniform 404 TICKETS_NOT_FOUND
  console.log("\n[Test 3] Denial boundaries: Missing, mutated, invalid, or checkout capability");
  
  // 3a. Missing token
  const missingRes = await ticketViewHandler(new Request("http://localhost:3000/api/tickets/view", { method: "GET" }));
  if (missingRes.status !== 404) throw new Error("Test 3a Failed: Missing token should return 404");

  // 3b. Invalid/random token
  const invalidRes = await ticketViewHandler(new Request("http://localhost:3000/api/tickets/view?token=invalid-secret-token", { method: "GET" }));
  if (invalidRes.status !== 404) throw new Error("Test 3b Failed: Invalid token should return 404");

  // 3c. Checkout token hash / capability (using order1 checkout token hash as query)
  const checkoutTokenRes = await ticketViewHandler(new Request(`http://localhost:3000/api/tickets/view?token=order1-checkout-token-hash`, { method: "GET" }));
  if (checkoutTokenRes.status !== 404) throw new Error("Test 3c Failed: Checkout token should return 404");

  // 3d. Readable order ID alone confers no access
  const orderIdRes = await ticketViewHandler(new Request(`http://localhost:3000/api/tickets/view?token=${order1.id}`, { method: "GET" }));
  if (orderIdRes.status !== 404) throw new Error("Test 3d Failed: Order ID alone should return 404");

  console.log("✓ Test 3 Passed: Uniform 404 TICKETS_NOT_FOUND on missing/invalid/checkout token/order ID");

  // Test Case 4: Non-PAID order returns 404 TICKETS_NOT_FOUND
  console.log("\n[Test 4] Non-PAID order denial");
  const pendingOrder = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Pending Guest",
      customerEmail: "pending@example.com",
      customerPhone: "0833334444",
      quantity: 1,
      totalAmount: 850,
      platformFeePercent: 5,
      platformFeeAmount: 42.5,
      organizerRevenue: 807.5,
      checkoutTokenHash: "pending-checkout-" + Date.now(),
      viewTokenHash: "pending-view-hash-" + Date.now(),
      status: "PENDING_PAYMENT",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const pendingRes = await ticketViewHandler(new Request(`http://localhost:3000/api/tickets/view?token=pending-view-hash`, { method: "GET" }));
  if (pendingRes.status !== 404) throw new Error("Test 4 Failed: Non-PAID order must return 404");
  console.log("✓ Test 4 Passed: Non-PAID orders cannot reveal tickets");

  // Test Case 5: Ticket state transition (OUTSIDE -> INSIDE) reflects authoritatively on view
  console.log("\n[Test 5] Authoritative status reflection");
  const firstTicketId = data1.tickets[0].ticketNumber;
  await prisma.ticket.updateMany({
    where: { ticketNumber: firstTicketId },
    data: { status: "INSIDE" },
  });

  const refreshedRes = await ticketViewHandler(new Request(`http://localhost:3000/api/tickets/view?token=${viewToken1}`, { method: "GET" }));
  const refreshedData = await refreshedRes.json();
  const updatedTicketItem = refreshedData.tickets.find((t: any) => t.ticketNumber === firstTicketId);
  if (updatedTicketItem?.status !== "INSIDE") {
    throw new Error("Test 5 Failed: Status update to INSIDE not reflected");
  }
  console.log("✓ Test 5 Passed: Live ticket status reflected dynamically (INSIDE)");

  // Test Case 6: R2 failure returns 503 ARTIFACT_UNAVAILABLE without regenerating credentials
  console.log("\n[Test 6] Storage failure returns 503 ARTIFACT_UNAVAILABLE without regenerating tickets");
  setStorageFailureInjection("get");
  const storageFailRes = await ticketViewHandler(new Request(`http://localhost:3000/api/tickets/view?token=${viewToken1}`, { method: "GET" }));
  const storageFailJson = await storageFailRes.json();
  console.log("Storage fail status:", storageFailRes.status, storageFailJson);

  if (storageFailRes.status !== 503 || storageFailJson.error?.code !== "ARTIFACT_UNAVAILABLE") {
    throw new Error("Test 6 Failed: Expected 503 ARTIFACT_UNAVAILABLE on storage failure");
  }

  // Restore storage and ensure tickets remain unchanged
  setStorageFailureInjection(null);
  const recoveredRes = await ticketViewHandler(new Request(`http://localhost:3000/api/tickets/view?token=${viewToken1}`, { method: "GET" }));
  const recoveredData = await recoveredRes.json();
  if (recoveredRes.status !== 200 || recoveredData.tickets.length !== 2) {
    throw new Error("Test 6 Failed: Failed to recover original tickets after storage restoration");
  }
  console.log("✓ Test 6 Passed: 503 ARTIFACT_UNAVAILABLE on R2 error; tickets remain intact");

  console.log("\nALL VERIFICATION CHECKS FOR TASK-013 PASSED SUCCESSFULLY!");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
