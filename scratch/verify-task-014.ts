import { prisma } from "../src/lib/prisma";
import {
  prepareTicketArtifacts,
  issueTicketsInTransaction,
} from "../src/lib/ticket-service";
import { setMockStorage } from "../src/lib/storage";
import { POST as checkinHandler } from "../src/app/api/organizer/checkin/route";
import { GET as recentHandler } from "../src/app/api/organizer/checkin/recent/route";
import { createSessionToken, getSessionSecret, SESSION_COOKIE_NAME } from "../src/lib/session";

async function makeCookie(userId: string, role: "ADMIN" | "ORGANIZER") {
  const token = await createSessionToken(
    { id: userId, role },
    getSessionSecret()
  );
  return `${SESSION_COOKIE_NAME}=${token}`;
}

async function runVerification() {
  console.log("=== START VERIFY TASK-014 ===");
  setMockStorage(new Map());

  // 1. Fetch / ensure Organizer 1, Organizer 2, Admin
  let org1 = await prisma.user.findFirst({ where: { email: "org1@test.com" } });
  if (!org1) {
    org1 = await prisma.user.create({
      data: {
        email: "org1@test.com",
        passwordHash: "dummyhash",
        name: "Organizer One",
        role: "ORGANIZER",
      },
    });
  }

  let org2 = await prisma.user.findFirst({ where: { email: "org2@test.com" } });
  if (!org2) {
    org2 = await prisma.user.create({
      data: {
        email: "org2@test.com",
        passwordHash: "dummyhash",
        name: "Organizer Two",
        role: "ORGANIZER",
      },
    });
  }

  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "admin@test.com",
        passwordHash: "dummyhash",
        name: "Admin User",
        role: "ADMIN",
      },
    });
  }

  const cookieOrg1 = await makeCookie(org1.id, "ORGANIZER");
  const cookieOrg2 = await makeCookie(org2.id, "ORGANIZER");
  const cookieAdmin = await makeCookie(admin.id, "ADMIN");

  // 2. Setup Events
  const event1 = await prisma.event.create({
    data: {
      organizerId: org1.id,
      name: "Rock Wave Festival 2026",
      description: "Live Rock Music Festival",
      imageUrl: "https://example.com/rock.jpg",
      venue: "Impact Arena",
      eventDate: new Date("2026-11-20"),
      startTime: "18:30",
      ticketPrice: 850,
      totalTickets: 100,
      status: "PUBLISHED",
    },
  });

  const event2 = await prisma.event.create({
    data: {
      organizerId: org2.id,
      name: "Indie Chill Night",
      description: "Indie Acoustic Live",
      imageUrl: "https://example.com/indie.jpg",
      venue: "Voice Space",
      eventDate: new Date("2026-12-05"),
      startTime: "19:00",
      ticketPrice: 500,
      totalTickets: 50,
      status: "PUBLISHED",
    },
  });

  // Setup Order & Tickets for Event 1 (PAID)
  const order1 = await prisma.order.create({
    data: {
      eventId: event1.id,
      customerName: "Alice Wonderland",
      customerEmail: "alice@example.com",
      customerPhone: "0811112222",
      quantity: 3,
      totalAmount: 2550,
      platformFeePercent: 5,
      platformFeeAmount: 127.5,
      organizerRevenue: 2422.5,
      checkoutTokenHash: "order1-checkout-token-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const prepared1 = await prepareTicketArtifacts(order1.id, event1.id, 3);
  await prisma.$transaction(async (tx) => {
    await issueTicketsInTransaction(tx, prepared1, admin.id);
  });
  const ticketSecrets1 = prepared1.tickets.map((t) => t.qrSecret); // array of 3 plain secrets

  // Setup Order & Tickets for Event 2 (PAID)
  const order2 = await prisma.order.create({
    data: {
      eventId: event2.id,
      customerName: "Bob Builder",
      customerEmail: "bob@example.com",
      customerPhone: "0822223333",
      quantity: 1,
      totalAmount: 500,
      platformFeePercent: 5,
      platformFeeAmount: 25,
      organizerRevenue: 475,
      checkoutTokenHash: "order2-checkout-token-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const prepared2 = await prepareTicketArtifacts(order2.id, event2.id, 1);
  await prisma.$transaction(async (tx) => {
    await issueTicketsInTransaction(tx, prepared2, admin.id);
  });
  const ticketSecrets2 = prepared2.tickets.map((t) => t.qrSecret); // 1 secret for event 2

  // -------------------------------------------------------------
  // Test 1: Denial & Security Boundary (401, 403, 404, 422, CSRF)
  // -------------------------------------------------------------
  console.log("\n[Test 1] Authorization, CSRF, and Validation Denial");
  const initialScansCount = await prisma.ticketScan.count();

  // 1a. No session (401)
  const reqNoSession = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId: event1.id, qrToken: ticketSecrets1[0], action: "CHECK_IN" }),
  });
  const resNoSession = await checkinHandler(reqNoSession);
  if (resNoSession.status !== 401) throw new Error(`1a Failed: Expected 401, got ${resNoSession.status}`);

  // 1b. Wrong role (ADMIN attempting organizer checkin) (403)
  const reqWrongRole = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieAdmin },
    body: JSON.stringify({ eventId: event1.id, qrToken: ticketSecrets1[0], action: "CHECK_IN" }),
  });
  const resWrongRole = await checkinHandler(reqWrongRole);
  if (resWrongRole.status !== 403) throw new Error(`1b Failed: Expected 403, got ${resWrongRole.status}`);

  // 1c. Cross-origin mutation (403)
  const reqCrossOrigin = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieOrg1,
      Origin: "https://malicious-site.com",
    },
    body: JSON.stringify({ eventId: event1.id, qrToken: ticketSecrets1[0], action: "CHECK_IN" }),
  });
  const resCrossOrigin = await checkinHandler(reqCrossOrigin);
  if (resCrossOrigin.status !== 403) throw new Error(`1c Failed: Expected 403 for cross-origin, got ${resCrossOrigin.status}`);

  // 1d. Foreign event (Org 2 trying to scan Org 1's event) (403)
  const reqForeignEvent = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg2 },
    body: JSON.stringify({ eventId: event1.id, qrToken: ticketSecrets1[0], action: "CHECK_IN" }),
  });
  const resForeignEvent = await checkinHandler(reqForeignEvent);
  if (resForeignEvent.status !== 403) throw new Error(`1d Failed: Expected 403 for foreign event, got ${resForeignEvent.status}`);

  // 1e. Non-existent event (404)
  const reqNonExistent = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: "non-existent-event-id", qrToken: ticketSecrets1[0], action: "CHECK_IN" }),
  });
  const resNonExistent = await checkinHandler(reqNonExistent);
  if (resNonExistent.status !== 404) throw new Error(`1e Failed: Expected 404 for missing event, got ${resNonExistent.status}`);

  // 1f. Malformed input (422)
  const reqMalformed = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: "", action: "INVALID_ACTION_NAME" }),
  });
  const resMalformed = await checkinHandler(reqMalformed);
  if (resMalformed.status !== 422) throw new Error(`1f Failed: Expected 422 for malformed body, got ${resMalformed.status}`);

  // Check that NO audit rows were created for these rejected requests
  const afterRejectionsCount = await prisma.ticketScan.count();
  if (afterRejectionsCount !== initialScansCount) {
    throw new Error(`Test 1 Failed: Unauthorized/malformed requests must NOT create TicketScan rows. Diff: ${afterRejectionsCount - initialScansCount}`);
  }
  console.log("✓ Test 1 Passed: 401, 403, 404, 422 enforced without fabricating unauthenticated audit rows");

  // -------------------------------------------------------------
  // Test 2: Negative Scan Attempts with Attributable Audit
  // -------------------------------------------------------------
  console.log("\n[Test 2] Negative Scans (INVALID, ticket-number-only, WRONG_EVENT, UNPAID, CANCELLED)");

  // 2a. Unknown QR token -> INVALID
  const reqUnknown = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: "random-fake-secret-32-bytes-token", action: "CHECK_IN" }),
  });
  const resUnknown = await checkinHandler(reqUnknown);
  const dataUnknown = await resUnknown.json();
  if (resUnknown.status !== 200 || dataUnknown.result !== "INVALID") {
    throw new Error(`2a Failed: Expected 200 INVALID, got ${resUnknown.status} ${dataUnknown.result}`);
  }
  const scanUnknown = await prisma.ticketScan.findFirst({
    where: { eventId: event1.id, result: "INVALID" },
    orderBy: { scannedAt: "desc" },
  });
  if (!scanUnknown || scanUnknown.ticketId !== null) {
    throw new Error("2a Failed: Unknown token must audit with ticketId: null");
  }

  // 2b. Ticket Number Only (AC-10 scan denial)
  const ticket1 = await prisma.ticket.findFirst({ where: { eventId: event1.id } });
  if (!ticket1) throw new Error("No ticket found");
  const reqTicketNumber = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: ticket1.ticketNumber, action: "CHECK_IN" }),
  });
  const resTicketNumber = await checkinHandler(reqTicketNumber);
  const dataTicketNumber = await resTicketNumber.json();
  if (resTicketNumber.status !== 200 || dataTicketNumber.result !== "INVALID") {
    throw new Error(`2b Failed: Expected 200 INVALID for ticket-number-only scan, got ${dataTicketNumber.result}`);
  }

  // 2c. WRONG_EVENT (Ticket from Event 2 scanned at Event 1)
  const reqWrongEvent = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: ticketSecrets2[0], action: "CHECK_IN" }),
  });
  const resWrongEvent = await checkinHandler(reqWrongEvent);
  const dataWrongEvent = await resWrongEvent.json();
  if (resWrongEvent.status !== 200 || dataWrongEvent.result !== "WRONG_EVENT") {
    throw new Error(`2c Failed: Expected 200 WRONG_EVENT, got ${dataWrongEvent.result}`);
  }
  const scanWrongEvent = await prisma.ticketScan.findFirst({
    where: { eventId: event1.id, result: "WRONG_EVENT" },
    orderBy: { scannedAt: "desc" },
  });
  if (!scanWrongEvent || scanWrongEvent.eventId !== event1.id) {
    throw new Error("2c Failed: WRONG_EVENT audit must record selected event");
  }

  // 2d. CANCELLED ticket
  const ticketCancelled = await prisma.ticket.findFirst({
    where: { eventId: event1.id, id: { not: ticket1.id } },
  });
  if (!ticketCancelled) throw new Error("No ticket for cancel");
  await prisma.ticket.update({
    where: { id: ticketCancelled.id },
    data: { status: "CANCELLED" },
  });
  // Find secret for this ticket
  const cancelledIndex = prepared1.tickets.findIndex((t) => t.ticketNumber === ticketCancelled.ticketNumber);
  const cancelledSecret = ticketSecrets1[cancelledIndex];

  const reqCancelled = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: cancelledSecret, action: "CHECK_IN" }),
  });
  const resCancelled = await checkinHandler(reqCancelled);
  const dataCancelled = await resCancelled.json();
  if (resCancelled.status !== 200 || dataCancelled.result !== "CANCELLED") {
    throw new Error(`2d Failed: Expected 200 CANCELLED, got ${dataCancelled.result}`);
  }

  console.log("✓ Test 2 Passed: Negative scan vocabulary verified with attributable audit records");

  // -------------------------------------------------------------
  // Test 3: Valid Transitions & Re-entry Cycle
  // -------------------------------------------------------------
  console.log("\n[Test 3] Valid CHECK_IN, Duplicate, CHECK_OUT, Re-entry");

  // Choose remaining OUTSIDE ticket
  const validIndex = prepared1.tickets.findIndex((t) => t.ticketNumber === ticket1.ticketNumber);
  const validSecret = ticketSecrets1[validIndex];

  // 3a. CHECK_IN: OUTSIDE -> INSIDE (VALID)
  const reqCheckIn = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_IN" }),
  });
  const resCheckIn = await checkinHandler(reqCheckIn);
  const dataCheckIn = await resCheckIn.json();
  if (resCheckIn.status !== 200 || dataCheckIn.result !== "VALID" || dataCheckIn.ticket?.status !== "INSIDE") {
    throw new Error(`3a Failed: Expected 200 VALID with status INSIDE, got ${dataCheckIn.result}`);
  }
  const tAfterCheckIn = await prisma.ticket.findUnique({ where: { id: ticket1.id } });
  if (tAfterCheckIn?.status !== "INSIDE") throw new Error("3a Failed: Ticket DB status must be INSIDE");

  // 3b. Duplicate CHECK_IN: already INSIDE (ALREADY_CHECKED_IN)
  const reqDupCheckIn = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_IN" }),
  });
  const resDupCheckIn = await checkinHandler(reqDupCheckIn);
  const dataDupCheckIn = await resDupCheckIn.json();
  if (resDupCheckIn.status !== 200 || dataDupCheckIn.result !== "ALREADY_CHECKED_IN") {
    throw new Error(`3b Failed: Expected ALREADY_CHECKED_IN, got ${dataDupCheckIn.result}`);
  }

  // 3c. CHECK_OUT: INSIDE -> OUTSIDE (VALID)
  const reqCheckOut = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_OUT" }),
  });
  const resCheckOut = await checkinHandler(reqCheckOut);
  const dataCheckOut = await resCheckOut.json();
  if (resCheckOut.status !== 200 || dataCheckOut.result !== "VALID" || dataCheckOut.ticket?.status !== "OUTSIDE") {
    throw new Error(`3c Failed: Expected 200 VALID with status OUTSIDE, got ${dataCheckOut.result}`);
  }
  const tAfterCheckOut = await prisma.ticket.findUnique({ where: { id: ticket1.id } });
  if (tAfterCheckOut?.status !== "OUTSIDE") throw new Error("3c Failed: Ticket DB status must be OUTSIDE");

  // 3d. INVALID_ACTION: CHECK_OUT on already OUTSIDE ticket
  const reqInvalidOut = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_OUT" }),
  });
  const resInvalidOut = await checkinHandler(reqInvalidOut);
  const dataInvalidOut = await resInvalidOut.json();
  if (resInvalidOut.status !== 200 || dataInvalidOut.result !== "INVALID_ACTION") {
    throw new Error(`3d Failed: Expected INVALID_ACTION, got ${dataInvalidOut.result}`);
  }

  // 3e. Re-entry: CHECK_IN on newly OUTSIDE ticket (VALID)
  const reqReentry = new Request("http://localhost:3000/api/organizer/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
    body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_IN" }),
  });
  const resReentry = await checkinHandler(reqReentry);
  const dataReentry = await resReentry.json();
  if (resReentry.status !== 200 || dataReentry.result !== "VALID" || dataReentry.ticket?.status !== "INSIDE") {
    throw new Error(`3e Failed: Expected VALID for re-entry, got ${dataReentry.result}`);
  }

  console.log("✓ Test 3 Passed: Check-in, duplicate prevention, checkout, and re-entry verified");

  // -------------------------------------------------------------
  // Test 4: Concurrency & Competing CHECK_IN Race
  // -------------------------------------------------------------
  console.log("\n[Test 4] Atomic CAS Concurrency Test");

  // Reset ticket to OUTSIDE
  await prisma.ticket.update({
    where: { id: ticket1.id },
    data: { status: "OUTSIDE" },
  });

  const [raceRes1, raceRes2] = await Promise.all([
    checkinHandler(
      new Request("http://localhost:3000/api/organizer/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
        body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_IN" }),
      })
    ),
    checkinHandler(
      new Request("http://localhost:3000/api/organizer/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieOrg1 },
        body: JSON.stringify({ eventId: event1.id, qrToken: validSecret, action: "CHECK_IN" }),
      })
    ),
  ]);

  const raceData1 = await raceRes1.json();
  const raceData2 = await raceRes2.json();
  const results = [raceData1.result, raceData2.result].sort();
  console.log("Concurrent scan results:", results);

  if (results[0] !== "ALREADY_CHECKED_IN" || results[1] !== "VALID") {
    throw new Error(`Test 4 Failed: Expected one VALID and one ALREADY_CHECKED_IN, got ${results}`);
  }
  console.log("✓ Test 4 Passed: Atomic CAS prevents concurrent double check-in");

  // -------------------------------------------------------------
  // Test 5: Recent Scans Endpoint (/api/organizer/checkin/recent)
  // -------------------------------------------------------------
  console.log("\n[Test 5] Recent Scans API (/api/organizer/checkin/recent)");

  // 5a. Unauthorized without session (401)
  const resRecentNoAuth = await recentHandler(new Request("http://localhost:3000/api/organizer/checkin/recent"));
  if (resRecentNoAuth.status !== 401) throw new Error("5a Failed: Expected 401");

  // 5b. Foreign event (403)
  const resRecentForeign = await recentHandler(
    new Request(`http://localhost:3000/api/organizer/checkin/recent?eventId=${event1.id}`, {
      headers: { Cookie: cookieOrg2 },
    })
  );
  if (resRecentForeign.status !== 403) throw new Error("5b Failed: Expected 403 for foreign event");

  // 5c. Own event recent scans (200)
  const resRecentOwn = await recentHandler(
    new Request(`http://localhost:3000/api/organizer/checkin/recent?eventId=${event1.id}`, {
      headers: { Cookie: cookieOrg1 },
    })
  );
  if (resRecentOwn.status !== 200) throw new Error("5c Failed: Expected 200");
  const dataRecentOwn = await resRecentOwn.json();
  console.log("Recent scans count for Event 1:", dataRecentOwn.scans.length);
  if (dataRecentOwn.scans.length === 0 || !dataRecentOwn.event) {
    throw new Error("5c Failed: Expected scans and event details");
  }

  // 5d. Events list when eventId omitted
  const resRecentList = await recentHandler(
    new Request("http://localhost:3000/api/organizer/checkin/recent", {
      headers: { Cookie: cookieOrg1 },
    })
  );
  const dataRecentList = await resRecentList.json();
  if (resRecentList.status !== 200 || !dataRecentList.events || dataRecentList.events.length === 0) {
    throw new Error("5d Failed: Expected events list for organizer");
  }
  console.log("✓ Test 5 Passed: Recent scans and events list endpoint verified");

  console.log("\nALL VERIFICATION SUITES FOR TASK-014 PASSED SUCCESSFULLY!");
}

runVerification()
  .catch((err) => {
    console.error("Verification error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
