# SPEC-010: Attendee and Order CSV Export for Organizers & Admin

- Status: done
- Requirement: [docs/requirement.md](../../docs/requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

Organizers and platform staff need to export attendee data and sales records out of the system for on-ground door registration, manual check-in verification backups, attendance tracking, and accounting. Currently, access to exported data is limited and not structured for gate operations.

The observable outcome of this feature is:
1. Organizers and Admins can export two distinct CSV formats directly from event cards and event detail views:
   - **Attendee Check-in List (รายชื่อผู้เข้างานรายใบ):** 1 row per ticket issued, formatted specifically for gate checkpoints with Ticket Number, Attendee Name, Contact, Ticket Status (INSIDE / OUTSIDE / CANCELLED), and Check-in info.
   - **Orders Summary (สรุปคำสั่งซื้อ):** 1 row per order, detailing financial metrics, ticket counts, and payment status for accounting.
2. The CSV downloads are encoded with UTF-8 BOM (`\uFEFF`) to ensure seamless Thai font rendering in Microsoft Excel and Google Sheets without encoding glitches.
3. Proper role-based access control: Organizers can only export data for their assigned events; Admins can export for all events.

## In scope

- A dedicated server-side export endpoint `GET /api/events/[id]/export?type=attendees|orders` enforcing role permissions (`ADMIN` or assigned `ORGANIZER`).
- Generation of sanitized CSV text formatted with UTF-8 BOM and RFC 4180 CSV escaping (handling commas, newlines, and double quotes).
- Per-ticket Attendee List CSV generation with check-in status and timestamps.
- Per-order Sales Summary CSV generation.
- UI triggers:
  - On the Organizer Concerts dashboard (`/organizer/events`): Quick Export dropdown/buttons directly on event cards and inside the detail modal.
  - On the Admin Concerts dashboard (`/admin/events`): Quick Export dropdown/buttons on event cards.
- Loading state feedback during CSV download generation.

## Out of scope

- Automated scheduled email delivery of CSVs.
- Custom column selector / reordering wizard (standard comprehensive columns are exported).
- Direct Excel (.xlsx) binary generation (standard UTF-8 CSV is universally supported by Excel, Numbers, and Google Sheets).

## User flow and behavior

### Primary Flow 1: Organizer Exports Gate Attendee List
1. Organizer logs in and navigates to "จัดการคอนเสิร์ต" (`/organizer/events`).
2. On any concert card or inside the detail modal, Organizer clicks "ส่งออกรายชื่อผู้เข้างาน (CSV)".
3. The browser triggers a download for a file named `<EventName>_attendees_<YYYY-MM-DD>.csv`.
4. When opened in Microsoft Excel or Google Sheets, Thai characters render properly, displaying each ticket's holder name, phone, ticket number, status (INSIDE / OUTSIDE), and order ID.

### Primary Flow 2: Organizer / Admin Exports Order Summary
1. Staff member clicks "ส่งออกสรุปคำสั่งซื้อ (CSV)".
2. The browser downloads `<EventName>_orders_<YYYY-MM-DD>.csv`.
3. The CSV contains order ID, purchase date, customer details, quantity, total amount, net organizer revenue, and order status.

### Alternate / Error Flow: Unauthorized Export
1. If an Organizer attempts to export an event ID that is not assigned to them, the server responds with HTTP 403 Forbidden.
2. If unauthenticated, the server responds with HTTP 401 Unauthorized.

## Business rules and constraints

1. **Authorization Guard:**
   - Platform `ADMIN` can export any event's CSV.
   - `ORGANIZER` can only export events where `event.organizerId === session.userId`.
2. **Data Filtering in Attendee Export:**
   - Only tickets belonging to confirmed orders (`status: PAID`) or orders with tickets are exported in the attendee check-in sheet.
   - Cancelled or expired orders without valid tickets are excluded from the physical check-in sheet.
3. **Encoding & Excel Compatibility:**
   - Every CSV file must start with UTF-8 Byte Order Mark (`\uFEFF`) to prevent Excel from interpreting UTF-8 Thai text as Windows-874 / CP1252.
   - RFC 4180 escaping: fields containing commas, double quotes, or newlines must be enclosed in double quotes, with internal quotes doubled (`""`).
4. **Content-Disposition:**
   - Response header `Content-Disposition: attachment; filename="<filename>.csv"` with safe ASCII / URI-encoded filename fallback.

## Data and permissions

### Attendee Export Fields (Mode: `attendees`)
| Header | Description | Source |
| --- | --- | --- |
| ลำดับ (No.) | Sequential row index | Computed |
| เลขที่บัตร (Ticket Number) | Unique ticket number | `Ticket.ticketNumber` |
| สถานะบัตร (Ticket Status) | OUTSIDE / INSIDE / CANCELLED | `Ticket.status` |
| ชื่อผู้เข้างาน (Attendee Name) | Buyer / Attendee name | `Order.customerName` |
| อีเมล (Email) | Attendee email | `Order.customerEmail` |
| เบอร์โทรศัพท์ (Phone) | Attendee phone | `Order.customerPhone` |
| รหัสคำสั่งซื้อ (Order ID) | Order identifier | `Order.id` |
| วันที่สั่งซื้อ (Order Date) | Date & time formatted in Thai locale | `Order.createdAt` |
| จำนวนบัตรในออเดอร์ | Total tickets in this order | `Order.quantity` |
| ยอดชำระคำสั่งซื้อ (บาท) | Order total amount | `Order.totalAmount` |

### Orders Export Fields (Mode: `orders`)
| Header | Description | Source |
| --- | --- | --- |
| ลำดับ (No.) | Sequential row index | Computed |
| รหัสคำสั่งซื้อ (Order ID) | Order ID | `Order.id` |
| วันที่สั่งซื้อ (Order Date) | Purchase timestamp | `Order.createdAt` |
| ชื่อผู้ซื้อ (Customer Name) | Buyer name | `Order.customerName` |
| อีเมล (Email) | Buyer email | `Order.customerEmail` |
| เบอร์โทรศัพท์ (Phone) | Buyer phone | `Order.customerPhone` |
| จำนวนบัตร (Quantity) | Ticket count | `Order.quantity` |
| ยอดรวม (บาท) | Total price paid | `Order.totalAmount` |
| ค่าธรรมเนียมระบบ (บาท) | Platform fee | `Order.platformFeeAmount` |
| รายได้สุทธิผู้จัด (บาท) | Net organizer revenue | `Order.organizerRevenue` |
| สถานะคำสั่งซื้อ (Status) | PAID, PENDING, etc. | `Order.status` |
| รายการเลขที่บัตร | Comma-separated ticket numbers | Joined `tickets.ticketNumber` |

## Errors and edge cases

- **Event Not Found:** Returns 404 with JSON error `{ error: "ไม่พบข้อมูลคอนเสิร์ต" }`.
- **Forbidden:** Returns 403 when an organizer accesses another organizer's event.
- **Empty Event (0 orders / 0 attendees):** Still returns a valid CSV with standard headers and 0 data rows.
- **Special Characters in Names:** Names with commas, quotes, or line breaks are properly escaped according to RFC 4180.

## Interfaces and observable test points

- **API Route:** `GET /api/events/[id]/export?type=attendees|orders`
  - Headers:
    - `Content-Type: text/csv; charset=utf-8`
    - `Content-Disposition: attachment; filename="<safe_filename>.csv"`
    - `Cache-Control: private, no-store`
- **Organizer UI:**
  - In `src/app/organizer/events/page.tsx`: Export CSV button on event card and inside modal with selection between "รายชื่อผู้เข้างาน (Attendees)" and "สรุปคำสั่งซื้อ (Orders)".
- **Admin UI:**
  - In `src/app/admin/events/page.tsx`: Export CSV action for Admin on concert cards.

## Acceptance criteria

- AC-01: Given an authenticated Organizer or Admin, when requesting `GET /api/events/[id]/export?type=attendees` for an authorized event, then the response is a downloadable CSV file containing UTF-8 BOM, standard attendee columns, and one row per issued ticket.
- AC-02: Given an authenticated Organizer or Admin, when requesting `GET /api/events/[id]/export?type=orders` for an authorized event, then the response is a downloadable CSV file containing UTF-8 BOM, order financial metrics, and one row per order.
- AC-03: Given an Organizer requesting export for an event belonging to a different organizer, then the API responds with HTTP 403 Forbidden.
- AC-04: Given special characters (quotes, commas, newlines, Thai text) in attendee names or event titles, when exporting CSV, then fields are properly RFC-4180 escaped and render without corruption or font issues.
- AC-05: Given the Organizer Events page (`/organizer/events`), when viewing event cards or the event modal, then an intuitive export interface is accessible allowing one-click download of both attendee and order CSV reports.
- AC-06: Given the Admin Events page (`/admin/events`), when viewing concert cards, then an export action is accessible allowing Admins to download attendee/order CSV reports for any event.

## Verification plan

| AC | Verification |
| --- | --- |
| AC-01 | API test requesting `type=attendees` verifies 200 status, `text/csv` header, UTF-8 BOM byte sequence `\uFEFF`, and expected attendee columns. |
| AC-02 | API test requesting `type=orders` verifies 200 status, `text/csv` header, UTF-8 BOM, and order financial columns. |
| AC-03 | Authorization test verifies 403 Forbidden when organizer ID does not match `event.organizerId`. |
| AC-04 | CSV formatting unit check verifies proper quoting and escaping for values with commas, quotes, and Thai scripts. |
| AC-05 | UI inspection on `/organizer/events` verifies export dropdown/buttons on event cards and detail modal. |
| AC-06 | UI inspection on `/admin/events` verifies export dropdown/buttons on event cards. |

## Open questions

None (feature requirements and specifications are agreed and ready).
