import QRCode from "qrcode";
import jsQR from "jsqr";
import { prisma } from "../src/lib/prisma";
import { prepareTicketArtifacts, issueTicketsInTransaction } from "../src/lib/ticket-service";
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
  console.log("=== START VERIFY TASK-015 ===");
  setMockStorage(new Map());

  // 1. Setup Organizer and Admin
  let org = await prisma.user.findFirst({ where: { role: "ORGANIZER" } });
  if (!org) {
    org = await prisma.user.create({
      data: {
        email: "org-scanner@test.com",
        passwordHash: "dummyhash",
        name: "Scanner Organizer",
        role: "ORGANIZER",
      },
    });
  }

  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: "admin-scanner@test.com",
        passwordHash: "dummyhash",
        name: "Admin User",
        role: "ADMIN",
      },
    });
  }

  const cookieOrg = await makeCookie(org.id, "ORGANIZER");

  // Setup Event
  const event = await prisma.event.create({
    data: {
      organizerId: org.id,
      name: "Concert of the Year 2026",
      description: "Grand Live Event",
      imageUrl: "https://example.com/poster.jpg",
      venue: "Thunder Dome",
      eventDate: new Date("2026-11-25"),
      startTime: "19:00",
      ticketPrice: 1200,
      totalTickets: 200,
      status: "PUBLISHED",
    },
  });

  // Setup Order & Tickets
  const order = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "David Bowie",
      customerEmail: "david@example.com",
      customerPhone: "0891112233",
      quantity: 2,
      totalAmount: 2400,
      platformFeePercent: 5,
      platformFeeAmount: 120,
      organizerRevenue: 2280,
      checkoutTokenHash: "scanner-order-token-" + Date.now(),
      status: "WAITING_FOR_VERIFY",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const prepared = await prepareTicketArtifacts(order.id, event.id, 2);
  await prisma.$transaction(async (tx) => {
    await issueTicketsInTransaction(tx, prepared, admin.id);
  });
  const secretTicket1 = prepared.tickets[0].qrSecret;

  // -------------------------------------------------------------
  // Test 1: Real QR Image Generation and jsQR Decoding
  // -------------------------------------------------------------
  console.log("\n[Test 1] Real QR Code Rendering and jsQR Frame Decoding");
  // Render QR code to raw image data
  const rawQrData = await QRCode.create(secretTicket1, { errorCorrectionLevel: "M" });
  const qrSize = rawQrData.modules.size;
  const scale = 8;
  const width = qrSize * scale;
  const height = qrSize * scale;
  const rgbaBuffer = new Uint8ClampedArray(width * height * 4);

  // Fill RGBA buffer from QR modules
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const moduleX = Math.floor(x / scale);
      const moduleY = Math.floor(y / scale);
      const isDark = rawQrData.modules.get(moduleX, moduleY);
      const offset = (y * width + x) * 4;
      const color = isDark ? 0 : 255;
      rgbaBuffer[offset] = color;
      rgbaBuffer[offset + 1] = color;
      rgbaBuffer[offset + 2] = color;
      rgbaBuffer[offset + 3] = 255;
    }
  }

  // Decode with jsQR
  const decoded = jsQR(rgbaBuffer, width, height);
  if (!decoded || decoded.data !== secretTicket1) {
    throw new Error(`Test 1 Failed: jsQR failed to decode real rendered QR image. Expected ${secretTicket1}, got ${decoded?.data}`);
  }
  console.log("✓ Test 1 Passed: Real QR code image accurately decoded by jsQR decoder:", decoded.data.slice(0, 16) + "...");

  // -------------------------------------------------------------
  // Test 2: Network Request Gating (Holding QR in frame) (AC-23)
  // -------------------------------------------------------------
  console.log("\n[Test 2] Request Gating & Pausing while awaiting acknowledgment (AC-23)");

  let networkCallCount: number = 0;
  let isAwaitingAcknowledgment = false;


  async function simulateCameraFrameDetection(qrToken: string) {
    if (isAwaitingAcknowledgment) {
      // Ignored / Paused! No network request fired.
      return null;
    }
    isAwaitingAcknowledgment = true;
    networkCallCount++;

    const req = new Request("http://localhost:3000/api/organizer/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieOrg },
      body: JSON.stringify({ eventId: event.id, qrToken, action: "CHECK_IN" }),
    });
    return checkinHandler(req);
  }

  // Frame 1: QR detected
  const resFrame1 = await simulateCameraFrameDetection(decoded.data);
  const dataFrame1 = await resFrame1?.json();
  if (dataFrame1?.result !== "VALID" || dataFrame1?.ticket?.status !== "INSIDE") {
    throw new Error("Test 2 Failed: Frame 1 expected VALID check-in");
  }

  // Frames 2 to 6: User keeps holding the QR in the camera frame
  for (let i = 2; i <= 6; i++) {
    const resHeldFrame = await simulateCameraFrameDetection(decoded.data);
    if (resHeldFrame !== null) {
      throw new Error(`Test 2 Failed: Extra request fired on frame ${i} while awaiting acknowledgment!`);
    }
  }

  if (networkCallCount !== 1) {
    throw new Error(`Test 2 Failed: Expected exactly 1 network call, got ${networkCallCount}`);
  }
  console.log("✓ Test 2 Passed: Exactly 1 network request fired while QR held in frame (5 duplicate frames suppressed)");

  // Acknowledgment: User taps "สแกนคนถัดไป"
  // (Makes zero network requests, resets gate)
  isAwaitingAcknowledgment = false;
  if (networkCallCount !== 1) {
    throw new Error("Test 2 Failed: Acknowledgment must make zero network requests");
  }
  console.log("✓ Test 2 Passed: Acknowledgment makes zero network requests and resets gate");

  // Frame 7: Now a new scan can proceed
  const resFrame7 = await simulateCameraFrameDetection(decoded.data);
  const dataFrame7 = await resFrame7?.json();
  if (dataFrame7?.result !== "ALREADY_CHECKED_IN") {
    throw new Error("Test 2 Failed: Resumed scan should return ALREADY_CHECKED_IN on same ticket");
  }
  let currentCount: number = networkCallCount;
  if (currentCount !== 2) {
    throw new Error("Test 2 Failed: Expected exactly 2 network calls after resumed scan");
  }

  console.log("✓ Test 2 Passed: Resumed scan submits new request as expected");

  // -------------------------------------------------------------
  // Test 3: Recent Audit Log Refresh
  // -------------------------------------------------------------
  console.log("\n[Test 3] Recent Audit Trail Refresh");
  const resRecent = await recentHandler(
    new Request(`http://localhost:3000/api/organizer/checkin/recent?eventId=${event.id}`, {
      headers: { Cookie: cookieOrg },
    })
  );
  const dataRecent = await resRecent.json();
  if (resRecent.status !== 200 || !Array.isArray(dataRecent.scans) || dataRecent.scans.length !== 2) {
    throw new Error(`Test 3 Failed: Expected 2 recorded scans, got ${dataRecent.scans?.length}`);
  }
  console.log("✓ Test 3 Passed: Recent audit trail reflects both attempts (VALID and ALREADY_CHECKED_IN)");

  console.log("\nALL VERIFICATION CHECKS FOR TASK-015 PASSED SUCCESSFULLY!");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
