# SPEC-015: Dual Posters, Admin-Controlled Student Privilege OTP, Protected Buyer Orders, and Gate Staff Delegation

- Status: ready
- Requirement: [docs/requirement.md](../../docs/requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: [docs/adr/0002-ticket-artifacts-guest-access-and-scan-audit.md](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md)

## Prototype references

- `admin-dash-v3` — `docs/assets/prototype/admin-dashboard.html`
- `admin-events-v4` — `docs/assets/prototype/admin-events.html`
- `admin-orders-v3` — `docs/assets/prototype/admin-orders.html`
- `event-v6` — `docs/assets/prototype/event-detail.html`
- `checkout-v5` — `docs/assets/prototype/checkout.html`
- `org-dash-v4` — `docs/assets/prototype/organizer-dashboard.html`
- `org-events-v5` — `docs/assets/prototype/organizer-events.html`
- `org-orders-v5` — `docs/assets/prototype/organizer-orders.html`
- `org-scanner-v5` — `docs/assets/prototype/organizer-scanner.html`

---

## Problem and outcome

1. **Dual Poster Displays & Structured Event Information:**
   - Concerts require both a **vertical portrait poster (3:4 or 4:5)** for catalog cards, search listings, and mobile feeds, and a **horizontal landscape banner (16:9)** for wide hero headers in event details and checkout. Monolithic text descriptions previously caused fragmented event information; organizers need dedicated fields for Lineup/Artists, Genre, Entry Rules (e.g., 20+, ID check, Re-entry), distinct Doors Open and Show timings, Sale Windows, and Google Maps venue URLs with active navigation buttons.
2. **Admin-Controlled Student Privilege & University OTP Verification:**
   - Institutional discounts (e.g., Ubon Ratchathani University `@ubu.ac.th`) must be strictly regulated. Event organizers must not be able to activate student privilege independently. Only Platform Admins have authority to enable the Student Privilege toggle upon event review, define the discounted ticket price, and link it to customer OTP email verification during checkout.
3. **Attendee Orders Privacy & Decoupling from Gate Status:**
   - In the organizer attendee orders screen, unmasked entry QR codes pose a serious security and fraud risk if screenshot or copied before the event. Furthermore, organizers managing orders and financial reconciliation need clean buyer and contact details rather than clutter from door check-in states (`INSIDE`/`OUTSIDE`), which belong strictly to gate operations.
4. **Gate Staff Delegation & Scan Audit Stream with Filters:**
   - Organizers must not scan tickets directly; their responsibility is delegating access by issuing staff-specific tokens and PINs tied to physical gates (e.g., Gate 1, Gate 2, VIP). Temporary staff must be strictly restricted to the mobile scanner interface (`/scanner/[token]`) with no access to organizer dashboards, revenue, or buyer details. Organizers require a real-time, multi-dimensional filtered audit stream of all gate scans (by keyword, result action, gate, and staff member).

Completing this feature produces:
- Dual poster storage (`poster_vertical_url` and `poster_horizontal_url`) with structured fields for lineup, genre, entry rules, door/show timings, sale windows, and Google Maps URL navigation.
- Role-based Student Privilege gate: locked/disabled in Organizer forms, active in Admin forms, and verified via 6-digit OTP for `@ubu.ac.th` emails on the customer checkout page.
- Security-masked QR codes and pure buyer/order information in `/organizer/orders` with door check-in status removed.
- Dedicated Gate Staff Management and a real-time Live Scan Audit Stream with multi-criteria filtering in `/organizer/scanner`.

---

## In scope

1. **Dual Posters & Structured Event Metadata:**
   - Database schema support for `poster_vertical_url`, `poster_horizontal_url`, `artists`, `genre`, `doors_open_time`, `show_start_time`, `show_end_time`, `sale_start_at`, `sale_end_at`, `google_maps_url`, and `entry_rules`.
   - Event creation & editing forms (`/organizer/events` and `/admin/events`) structured into organized steps with dual dropzones and a Google Maps live test button.
   - Customer `event-detail` (`event-v6`) displaying the 16:9 landscape hero banner, show timings, and clickable `📍 เปิด Google Maps นำทาง ↗` button.
2. **Admin-Controlled Student Privilege & Checkout OTP:**
   - Event model fields: `student_discount_active` (boolean, default false) and `student_price` (nullable decimal).
   - In `/organizer/events` modal: Student Privilege checkbox is disabled and locked with notice: `🔒 สิทธิ์เฉพาะแอดมิน (Admin Only) - ผู้จัดไม่สามารถเปิดเองได้`.
   - In `/admin/events` modal: Active toggle allowing Admin to enable/disable Student Privilege and specify the student price for `@ubu.ac.th`.
   - In customer `/checkout` (`checkout-v5`): Entering an `@ubu.ac.th` email prompts a 6-digit OTP verification block. Successful OTP entry unlocks the discounted student ticket price.
3. **Protected Buyer Orders View (`/organizer/orders`):**
   - Attendee list table and modal display strictly buyer information: Order Ref, Buyer Name, Email, Phone, Event, Ticket Tier, Ticket Reference, Quantity, Total Paid, Payment Method, and Order Date.
   - Removal of the "สถานะเข้างาน (Door Status)" column and `INSIDE`/`OUTSIDE` badges from `/organizer/orders`.
   - Security-masked QR code container in details modal with blur overlay and privacy notice: `🔒 QR Code ถูกปิดซ่อนไว้ (Security Masked)`.
   - Filter pills focused on ticket tiers (`ทั้งหมด`, `บัตรทั่วไป`, `ส่วนลดนักศึกษา @ubu`) and KPI summary cards focused on Tickets Sold, Paid Orders, and Revenue.
4. **Gate Staff Delegation & Scan Audit Stream (`/organizer/scanner`):**
   - Staff management section enabling organizers to create staff profiles (Name, Phone, Gate assignment, custom/generated PIN), view individual scan counts, copy personal token links (`/scanner/[token]`), and revoke active staff access.
   - Security boundary enforcement: Staff tokens grant access only to `/scanner/[token]` (camera scan view); staff are blocked from organizer dashboards, financial metrics, and customer lists.
   - Live Scan Audit Stream with real-time multi-dimensional filter bar:
     - Search input: Ticket number, Buyer name, or Staff name.
     - Action filter pills: `ALL`, `CHECK_IN`, `CHECK_OUT`, `REJECTED/INVALID`.
     - Gate dropdown: `ALL`, `Gate 1`, `Gate 2`, `VIP Gate`.
     - Staff dropdown: `ALL`, and individual staff members.

---

## Out of scope

- Customer account registration or login portals (guest checkout strictly maintained).
- Multi-tier assigned seating / seat maps (single-tier general admission + admin student pass strictly preserved).
- Automated payment gateway webhooks (PromptPay slip verification remains decoupled per ADR-0002).
- Native mobile app distribution (runs in responsive mobile browser).

---

## UI states

### 1. Event Forms (`/organizer/events` & `/admin/events`)
- **Default / Create:** Dual image upload dropzones; structured text inputs; locked student privilege box for organizers; active toggle for admins.
- **Validation Error:** Missing required fields, invalid Google Maps URL, or end sale date earlier than start sale date.
- **Submitted / Success:** Updates card in catalog and dashboard in real-time.

### 2. Customer Checkout (`checkout-v5`)
- **Default:** General Admission price applied.
- **Student Domain Detected (`@ubu.ac.th`):** OTP verification block displays target email with "ขอรหัส OTP" button.
- **OTP Sent:** 6-digit input boxes appear with 10-minute reservation countdown timer.
- **OTP Verified:** Student discount price applied, locked confirmation badge displayed.
- **OTP Invalid / Expired:** Error notification, prevents checkout progression.

### 3. Organizer Orders (`org-orders-v5`)
- **Table View:** Clean order listing with Order ID, Buyer Name, Email, Phone, Ticket Tier, Quantity, Total, and Payment status; no door statuses.
- **Modal View:** Displays full buyer order breakdown; entry QR code is visually masked/blurred with a security shield notice.
- **Filtered / Empty:** Shows zero-state message when search or tier filter yields no matching buyers.

### 4. Organizer Gate Scanner (`org-scanner-v5`)
- **Staff Delegation Table:** Shows active staff members, assigned gates, personal token links, PINs, and scan totals.
- **Staff Status:** `ACTIVE` (badge-lime) or `REVOKED` (badge-dark, red text).
- **Scan Audit Stream:** Real-time log showing timestamp, event action, attendee name & tier, ticket ref, gate, staff name, and inspection result.
- **Scan Filters:** Real-time row filtering across keyword search, result pills, gate dropdown, and staff dropdown.

---

## Acceptance Criteria

- **AC-01:** The Event data model and database schema store both `poster_vertical_url` (Portrait) and `poster_horizontal_url` (Landscape 16:9).
- **AC-02:** Event creation and editing interfaces support structured inputs for Artist Lineup, Music Genre, Entry Rules, Doors Open Time, Show Start/End Time, Sale Start/End Time, and Google Maps URL with a test link button.
- **AC-03:** In `/organizer/events`, the Student Privilege toggle is strictly read-only / disabled (`🔒 สิทธิ์เฉพาะแอดมิน - ผู้จัดไม่สามารถเปิดเองได้`) and cannot be activated by an organizer.
- **AC-04:** In `/admin/events`, Platform Admins can toggle Student Privilege on/off, set the discounted student ticket price, and link it to `@ubu.ac.th`.
- **AC-05:** On `event-detail` (`event-v6`), the 16:9 landscape banner renders at the top of the page, show timings are clearly broken down, and a clickable `📍 เปิด Google Maps นำทาง ↗` button links to the event's Google Maps location.
- **AC-06:** On `checkout` (`checkout-v5`), entering an `@ubu.ac.th` email triggers Step 3 (6-digit OTP verification) for events with active Student Privilege.
- **AC-07:** Entering the valid 6-digit OTP on `checkout` unlocks the discounted student ticket price for up to the permitted quota.
- **AC-08:** In `/organizer/orders` (`org-orders-v5`), the attendee list table displays only buyer and order details (Order ID, Customer Name, Email, Phone, Concert, Ticket Tier, Ticket Reference, Quantity, Total Paid, Payment Method, Order Date).
- **AC-09:** The "สถานะเข้างาน (Door Status)" column and `INSIDE`/`OUTSIDE` badges are completely excluded from `/organizer/orders`.
- **AC-10:** In `/organizer/orders` details modal, the ticket entry QR code is masked and blurred behind a security shield container (`🔒 QR Code ถูกปิดซ่อนไว้`).
- **AC-11:** In `/organizer/scanner` (`org-scanner-v5`), the organizer cannot scan tickets directly; the page provides a Gate Staff Management interface to add staff, assign gates, and issue scanner links.
- **AC-12:** Staff token links generated in `/organizer/scanner` grant access strictly to `/scanner/[token]` for camera scanning; attempts to access organizer or admin routes with a staff token are rejected.
- **AC-13:** The organizer can toggle staff status between `ACTIVE` and `REVOKED`; revoked staff tokens immediately block scanning access.
- **AC-14:** In `/organizer/scanner`, the Live Scan Audit Stream displays every scan event with timestamp, action (`CHECK_IN`/`CHECK_OUT`), attendee name & tier, ticket reference, gate station, staff member name, and verification result.
- **AC-15:** The Live Scan Audit Stream provides working real-time filters for free-text search (ticket/name/staff), action pills (`ALL`, `CHECK_IN`, `CHECK_OUT`, `REJECTED`), gate dropdown, and staff dropdown.
- **AC-16:** All customer, organizer, and admin interfaces strictly follow the high-contrast monochromatic black & white visual design system.

---

## Verification Plan

| AC | Verification Method | Details |
|---|---|---|
| AC-01, AC-02 | Unit / Schema Test | Verify Prisma migration includes dual poster fields, structured timing, rules, and Google Maps URL fields. |
| AC-03 | Component / API Test | Verify organizer API rejects `student_discount_active: true` when submitted by organizer session (HTTP 403 / field ignored). |
| AC-04 | Integration Test | Verify admin API permits updating `student_discount_active` and `student_price`. |
| AC-05 | Visual / Manual Review | Verify `event-detail` renders 16:9 banner, show timings, and clickable Google Maps navigation link. |
| AC-06, AC-07 | End-to-End / Flow Test | Test checkout with `@ubu.ac.th` email, assert OTP prompt appears, verify discount applies upon OTP entry. |
| AC-08, AC-09 | Visual / DOM Inspection | Assert `/organizer/orders` displays buyer info and contains no Door Status / INSIDE / OUTSIDE elements. |
| AC-10 | Visual / DOM Inspection | Open order modal in `/organizer/orders`, verify QR is blurred with security shield overlay. |
| AC-11, AC-12 | Security / Route Test | Create staff token in `/organizer/scanner`, verify `/scanner/[token]` opens scanner, verify `/organizer/*` rejects staff token. |
| AC-13 | Integration Test | Revoke staff token in `/organizer/scanner`, assert `/scanner/[token]` returns revoked error. |
| AC-14, AC-15 | Component / Interaction Test | Simulate scans, test filter controls (keyword, result pill, gate, staff), assert table rows update accurately. |
| AC-16 | Visual Audit | Inspect high-contrast black & white styling across all modified views. |
