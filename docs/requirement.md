สร้างเว็บไซต์ระบบขายบัตรคอนเสิร์ตสำหรับงานขนาดเล็ก โดยเน้น MVP ที่ใช้งานง่าย ไม่ซับซ้อน และสามารถนำไปพัฒนาต่อเป็นธุรกิจจริงได้

แนวคิดระบบ:
แพลตฟอร์มเป็นตัวกลางสำหรับผู้จัดงานขนาดเล็ก เช่น ร้านอาหาร ผับ บาร์ ศิลปินอิสระ มหาวิทยาลัย และงาน Local Event โดยผู้จัดงานสามารถสร้างงานและขายบัตรผ่านเว็บไซต์ และระบบคิดค่าธรรมเนียมเป็นเปอร์เซ็นต์จากยอดขาย

Tech Stack:
- Frontend: Next.js + TypeScript
- UI: Tailwind CSS
- Backend: Next.js API Routes หรือ Server Actions
- Database: PostgreSQL
- ORM: Prisma
- Authentication: ใช้สำหรับ Admin/Organizer เท่านั้น
- QR Code: ใช้ library สำหรับสร้าง QR Code
- Email: รองรับการส่งอีเมลแจ้งเตือนและส่งบัตร
- Storage: รองรับการเก็บสลิปการโอนเงิน
- Responsive: รองรับ Desktop และ Mobile

ไม่ต้องทำระบบที่ซับซ้อน เช่น
- ระบบจองที่นั่ง
- Seat Map
- Zone
- Queue
- Redis
- Microservices
- Customer Account
- ระบบเลือกที่นั่ง

====================
1. CUSTOMER FLOW
====================

หน้าแรก
→ แสดงรายการ Event
→ ลูกค้ากดเลือก Event
→ ดูรายละเอียด Event
→ เลือกจำนวนบัตร
→ กรอกชื่อ, Email และเบอร์โทรศัพท์
→ กดยืนยันคำสั่งซื้อ
→ ระบบสร้าง Order

ตัวอย่าง:
Event: Summer Live Concert
ราคาบัตร: 399 บาท
จำนวน: 3
ยอดรวม: 1,197 บาท

Order Status เริ่มต้น:
PENDING_PAYMENT

หลังสร้าง Order:
→ แสดงรายละเอียดการชำระเงิน
→ แสดง QR สำหรับโอนเงิน / ข้อมูลบัญชี
→ ลูกค้าชำระเงิน
→ ลูกค้า Upload Slip
→ Order เปลี่ยนเป็น WAITING_FOR_VERIFY

ห้ามเปลี่ยนเป็น PAID ทันทีหลัง Upload Slip

ลูกค้าต้องรอ Admin ตรวจสอบ

====================
2. ADMIN FLOW
====================

Admin Login
→ Admin Dashboard
→ Payment Verification

แสดงรายการ Order ที่รอตรวจสอบ เช่น:

Order #ORD-00125
Customer: John Doe
Email: john@example.com
Amount: 1,197 THB
Status: WAITING_FOR_VERIFY
Slip: แสดงรูปสลิป

Admin สามารถ:
- Approve
- Reject

ถ้า Reject:
WAITING_FOR_VERIFY
→ REJECTED

ส่ง Email แจ้งลูกค้าว่าไม่ผ่านการตรวจสอบ

ถ้า Approve:
WAITING_FOR_VERIFY
→ PAID

เมื่อ Order เป็น PAID เท่านั้น
ระบบจึงสร้าง Ticket

====================
3. TICKET SYSTEM
====================

1 Order สามารถมีหลาย Ticket

ตัวอย่าง:

Order #ORD-00125
จำนวน 3 ใบ

สร้าง:
Ticket #T001
Ticket #T002
Ticket #T003

แต่ละ Ticket ต้องมี QR Token ที่ไม่ซ้ำกัน

ห้ามใช้ Ticket Number เป็น Token สำหรับความปลอดภัย

ตัวอย่าง:

Ticket Number:
T001

QR Token:
random cryptographically secure token

QR Code ของแต่ละ Ticket ต้องไม่ซ้ำกัน

ถ้าซื้อ 3 ใบ ต้องสร้าง QR 3 อัน

====================
4. EMAIL TICKET
====================

หลัง Admin Approve:

Order
→ PAID
→ Create Tickets
→ Generate QR Codes
→ ส่ง Email

Email ต้องมี:
- ชื่องาน
- วันที่
- เวลา
- สถานที่
- Ticket Number
- QR Code
- จำนวนบัตร
- ข้อมูล Order

ถ้าซื้อหลายใบ ให้แสดง Ticket ทั้งหมดใน Email

สามารถมีปุ่ม:
"View My Tickets"

โดยใช้ secure token สำหรับเปิดหน้าบัตรโดยไม่ต้อง Login

====================
5. CHECK-IN SYSTEM
====================

Organizer Login
→ Dashboard
→ Check-in

มีหน้าสแกน QR Code

เมื่อสแกน:
1. อ่าน QR Token
2. ค้นหา Ticket
3. ตรวจสอบว่า Ticket มีอยู่จริง
4. ตรวจสอบว่า Ticket เป็นของ Event ที่กำลัง Check-in
5. ตรวจสอบว่า Order เป็น PAID
6. ตรวจสอบว่า Ticket ไม่ถูกยกเลิก
7. ตรวจสอบสถานะ Ticket
8. บันทึก Scan Log

ถ้า Ticket ถูกต้อง:
แสดง

VALID TICKET
Ticket #T001
Event: Summer Live Concert
Status: CHECKED IN

ถ้าใช้ซ้ำ:
ALREADY CHECKED IN

ถ้า Ticket ไม่ถูกต้อง:
INVALID TICKET

====================
6. RE-ENTRY
====================

ระบบต้องรองรับ Re-entry

Ticket Status:

OUTSIDE
INSIDE

เมื่อเข้าครั้งแรก:
OUTSIDE
→ CHECK_IN
→ INSIDE

เมื่อออก:
INSIDE
→ CHECK_OUT
→ OUTSIDE

เมื่อกลับเข้า:
OUTSIDE
→ CHECK_IN
→ INSIDE

ทุกการ Scan ต้องบันทึกลง Scan Log

ตัวอย่าง:

Ticket T001
10:05 CHECK_IN
13:20 CHECK_OUT
14:10 CHECK_IN

====================
7. DATABASE
====================

สร้าง Database Schema สำหรับ:

users
- id
- name
- email
- password
- role
- created_at

events
- id
- organizer_id
- name
- description
- image
- venue
- event_date
- start_time
- ticket_price
- total_tickets
- status
- created_at

orders
- id
- event_id
- customer_name
- customer_email
- customer_phone
- quantity
- total_amount
- status
- created_at

payments
- id
- order_id
- amount
- slip_url
- slip_hash
- status
- verified_by
- verified_at
- created_at

tickets
- id
- event_id
- order_id
- ticket_number
- qr_token_hash
- status
- created_at

ticket_scans
- id
- ticket_id
- action
- scanned_at
- staff_id

Order Status:
PENDING_PAYMENT
WAITING_FOR_VERIFY
PAID
REJECTED
EXPIRED
CANCELLED

Ticket Status:
OUTSIDE
INSIDE
CANCELLED

Scan Action:
CHECK_IN
CHECK_OUT

====================
8. ORGANIZER DASHBOARD
====================

สร้าง Dashboard สำหรับ Organizer

แสดง:

Total Events
Tickets Sold
Tickets Remaining
Revenue
Pending Verification
Checked In

ตัวอย่าง:

Tickets Sold
327 / 500

Revenue
130,473 THB

Waiting Verification
12 Orders

Checked In
289

Not Checked In
38

มีเมนู:

Dashboard
My Events
Create Event
Orders
Tickets
Check-in
Settings

====================
9. CREATE EVENT
====================

Organizer สามารถสร้าง Event

Fields:

Event Name
Description
Event Image
Venue
Event Date
Start Time
Ticket Price
Ticket Quantity

เมื่อสร้างแล้ว:
Draft

สามารถเปลี่ยนเป็น:
Published

เมื่อ Published:
ลูกค้าสามารถเข้าหน้า Event และซื้อบัตรได้

====================
10. ADMIN DASHBOARD
====================

Admin Dashboard ต้องมี:

Total Events
Total Orders
Total Revenue
Pending Verification
Total Tickets
Total Check-ins

เมนู:

Dashboard
Events
Orders
Payment Verification
Tickets
Users
Settings

====================
11. BUSINESS MODEL
====================

ระบบรองรับ Platform Fee

ตัวอย่าง:

Ticket Price = 399 THB
จำนวน = 500

Gross Sales:
199,500 THB

Platform Fee:
5%

Platform Revenue:
9,975 THB

ตัวเลข 5% เป็นค่าตัวอย่างและต้องสามารถตั้งค่าได้

ระบบควรเก็บข้อมูล:
ticket_price
platform_fee_percent
platform_fee_amount
organizer_revenue

====================
12. UI/UX
====================

ออกแบบให้ดูเป็น Modern Ticketing Platform

โทน:
- Modern
- Clean
- Professional
- เหมาะกับ Concert / Live Music / Local Event
- Mobile First

หน้า Event ต้องเน้น:
Event Image
ชื่อ Event
วันที่
เวลา
สถานที่
ราคาบัตร
จำนวนบัตร
ปุ่ม "ซื้อบัตร"

หน้า Checkout ต้องเรียบง่าย:
Customer Information
Order Summary
Payment Information
Upload Slip
Confirm

หน้า Ticket ต้องมี QR Code ขนาดใหญ่และอ่านง่าย

หน้า Check-in ต้องเหมาะกับมือถือ เพราะ Staff จะใช้โทรศัพท์สแกน QR หน้างาน

====================
13. SECURITY
====================

สำคัญ:

- ห้ามเชื่อข้อมูลจาก Frontend ว่าจ่ายเงินแล้ว
- Upload Slip ไม่ทำให้ Order เป็น PAID
- เฉพาะ Admin เท่านั้นที่สามารถ Approve Payment
- QR Token ต้องสุ่มและเดายาก
- ห้ามใช้ Ticket Number เป็น QR Token
- ตรวจสอบ Event ID ทุกครั้งตอน Scan
- ตรวจสอบ Order Status ก่อน Check-in
- ป้องกันการใช้ Ticket ซ้ำ
- ตรวจสอบสิทธิ์ Admin และ Organizer
- Validate File Upload
- จำกัดชนิดและขนาดไฟล์ Slip
- ป้องกัน SQL Injection
- ป้องกัน XSS
- ใช้ password hashing
- ใช้ secure session
- ทุก action สำคัญควรมี audit log

====================
14. IMPORTANT MVP RULES
====================

ต้องทำระบบให้เรียบง่ายก่อน

ไม่ต้องสร้าง:
- Seat Reservation
- Seat Selection
- Zone
- Customer Registration
- Customer Password
- Forgot Password
- Queue System
- Redis
- Microservices
- Payment Gateway ในเวอร์ชันแรก

Payment ใช้:
Bank Transfer + Upload Slip + Admin Verification

แต่ Architecture ต้องออกแบบให้สามารถเปลี่ยนในอนาคตเป็น Payment Gateway ได้ โดยไม่ต้องแก้ระบบ Ticket และ Check-in ใหม่ทั้งหมด

====================
15. REQUIRED OUTPUT
====================

ก่อนเริ่มเขียน Code ให้สร้าง:

1. System Architecture
2. Database ERD
3. Database Schema
4. API Endpoint List
5. Folder Structure
6. User Flow
7. Admin Flow
8. Organizer Flow
9. Customer Flow
10. Security Rules

จากนั้นเริ่มพัฒนา MVP ทีละ Module

ลำดับการพัฒนา:

Phase 1:
Database + Authentication

Phase 2:
Event Management

Phase 3:
Order + Checkout

Phase 4:
Slip Upload + Payment Verification

Phase 5:
Ticket Generation + QR

Phase 6:
Email Ticket

Phase 7:
QR Check-in

Phase 8:
Dashboard + Reports

ทุก Phase ต้องสามารถทดสอบได้ก่อนเริ่ม Phase ถัดไป

อย่าสร้างระบบเกิน Scope ที่ระบุ
และถ้ามีจุดที่ต้องตัดสินใจ ให้เลือกวิธีที่ง่ายที่สุดสำหรับ MVP ก่อน

## Confirmed Purchase and Entry Decisions

- Scope: SPEC-002 purchase, payment verification, ticket delivery, and event entry journeys.
- Status: Agreed
- Source: explicit user answers in `$grill-workflow` on 2026-10-06 (Asia/Bangkok).
- These decisions clarify the existing MVP. They do not authorize implementing code, alter completed task evidence, or confirm the prototype UI.

| ID | Selected option | State | Confirmed decision |
| --- | --- | --- | --- |
| S1 | A | Agreed | Store the original QR image privately in R2; the application checks access before returning it. The database stores the QR token hash and artifact location. Architecture: [ADR-0002](adr/0002-ticket-artifacts-guest-access-and-scan-audit.md). |
| S2 | A | Agreed | Extend the existing TicketScan model to record all scan attempts in one table, with optional ticket association, event, and result. Architecture: [ADR-0002](adr/0002-ticket-artifacts-guest-access-and-scan-audit.md). |
| S3 | A | Agreed | Use a checkout token for payment/order-status/slip access, separate from the ticket view_token delivered by email. Architecture: [ADR-0002](adr/0002-ticket-artifacts-guest-access-and-scan-audit.md). |
| F1 | A | Agreed | Accept only JPEG and PNG payment slips, with a maximum file size of 5 MB. Validate the actual file server-side; an input accept attribute does not enforce this rule. |
| R1 | A | Agreed | If QR preparation or ticket issuance fails during approval, approval has not succeeded and the order remains WAITING_FOR_VERIFY. Show the failure so Admin can retry; the retry must not produce duplicate tickets or falsely report PAID/issuance success. |
| R2 | A | Agreed | If tickets are successfully issued but email delivery fails, retain PAID and the existing tickets. Persist/show the unsuccessful delivery state and provide an Admin action to send the same tickets again. Automatic scheduled retry is not required for this MVP decision. |
| D1 | Yes | Agreed workflow intent | Perform `$grill-design` for the six SPEC-002 prototype journeys before confirming UI/design evidence. This opt-in does not approve any new visual choices. |

Private order access still enforces the original order status and 15-minute reservation rule: possession of a checkout token cannot extend a reservation or permit an expired upload. Email delivery success is separate from payment approval and ticket issuance success.

### Design discovery intent

- Scope: home-v1, event-v1, checkout-v1, tickets-v1, admin-v1, and scanner-v1 for SPEC-002.
- Discovery: completed
- Source: D1 = Yes, followed by explicit design answers D2–D7 = A and D8 = TICKETBOX, confirmed 2026-10-06.
- Existing direction: ADR-0001's high-contrast black-and-white aesthetic remains the base. Limited status colors and original-color event imagery are explicitly agreed exceptions for these six journeys, as recorded below.
- The agreed design brief is recorded in [UI Design Requirements](#ui-design-requirements). Discovery completion confirms the brief, not acceptance of the current or future prototype rendering; visual review remains pending.
- SPEC-002 remains draft. The owning specification workflow must incorporate the agreed decisions, complete API/state/error contracts, and reconcile UI evidence before it can become ready.

## UI Design Requirements

- Scope: SPEC-002's six journeys: home-v1, event-v1, checkout-v1, tickets-v1, admin-v1, and scanner-v1.
- Status: Agreed
- Source: explicit `$grill-design` request and answers on 2026-10-06 (Asia/Bangkok). User answer IDs D2–D8 map to stable record IDs D-02–D-08 below.
- Discovery: completed
- Product boundaries: [Confirmed Purchase and Entry Decisions](#confirmed-purchase-and-entry-decisions). UI discovery does not change permissions, reservation rules, ticket issuance, or the agreed failure/retry behavior.
- Prototype references are review evidence, not acceptance of every current layout or interaction. Existing revisions are unchanged in this workflow.

| ID | Scope | Status | Kind | Design decision | Basis / reference | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | All six SPEC-002 journeys | Agreed | constraint | Use the existing high-contrast black-and-white direction as the base, with only the scoped color exceptions in D-04 and D-05. Keep authoritative responsive/accessibility and product requirements active. | Explicit user request; [ADR-0001](adr/0001-core-architecture-and-tech-stack.md). [Current shared prototype styles](assets/prototype/style.css) are evidence, not blanket UI acceptance. | Inspect the views for a predominantly monochrome interface, readable contrast, and the agreed scoped exceptions. |
| D-02 | All six journeys, including Admin and Scanner | Agreed | constraint | Use dark backgrounds and white/light text throughout. Do not switch staff views to the proposed light theme. | D2 = A, explicit user answer on 2026-10-06. | Review all six views on mobile and desktop for the consistent dark base and readable text/controls. |
| D-03 | home-v1 and event-v1 | Agreed | constraint | Lead with event imagery and prominent event names, followed by date, venue, price, and the purchase action. Preserve an event-led hierarchy rather than the proposed compact information-first layout. Required event details remain available. | D3 = A; [home-v1](assets/prototype/index.html) and [event-v1](assets/prototype/event-detail.html) provide source-page context. | Inspect the first-read hierarchy and purchase action on desktop/mobile, checking that required details remain easy to find. |
| D-04 | Status feedback across all six journeys | Agreed | constraint | Permit limited green/yellow/red semantic status accents, always accompanied by meaningful text and icons. Main interface surfaces and controls remain based on black/white. This is a scoped exception to a strictly colorless interpretation of the monochrome base. | D4 = A; explicit selection of semantic status colors over the fully monochrome alternative. | Inspect success/waiting/error feedback for text and icon cues that remain understandable without color alone; verify contrast against the dark surfaces. |
| D-05 | Event photos/posters in the customer journeys | Agreed | constraint | Preserve organizers' original image colors; do not impose grayscale. Surrounding frames and interface remain monochrome. This is an explicit imagery exception, not permission for a new colored UI theme. | D5 = A; original-color imagery selected over grayscale. | Compare supplied event artwork with its displayed rendition and inspect that surrounding interface elements retain the agreed base. |
| D-06 | admin-v1 payment review | Agreed | constraint | On desktop, show the order information alongside the slip so both can be inspected together. On mobile, arrange order information, slip, and decision actions vertically in that order. | D6 = A; [admin-v1](assets/prototype/admin-verifications.html) is the targeted source revision. | Inspect concurrent order/slip visibility on desktop, mobile reading/action order, and usability of Approve/Reject under the agreed product rules. |
| D-07 | scanner-v1 scan feedback | Agreed | constraint | Show large, clear scan-result feedback below the camera. Staff acknowledge the result using “สแกนคนถัดไป” to continue, rather than the proposed popup covering the camera. Preserve the agreed scan mode, validation, and audit rules. | D7 = A; [scanner-v1](assets/prototype/organizer-checkin.html) is the targeted source revision. | Observe success, duplicate entry, invalid ticket, and checkout feedback below the camera, and use the acknowledgment action to return to the next scan. |
| D-08 | Display branding across all six journeys | Agreed | constraint | Use the display brand TICKETBOX, with that spelling and capitalization. This sets visible branding; it does not require renaming the repository, application package, or technical identifiers. | D8 = “ใช้ชื่อว่า TICKETBOX”, explicit user answer. | Inspect the brand label and visible page branding for the agreed name. |

### Open questions

- No consequential design conflict remains for this scoped brief. Exact fonts, spacing, radii, icon artwork, and animation parameters are not fixed by these answers and remain non-blocking details; do not present invented values as user-confirmed choices.
- Visual validation of the adjusted prototype remains pending. Existing v1 revisions are source evidence and have not been declared fully accepted by these design answers.
- The owning specification workflow still needs to incorporate the latest product and design agreements and complete its API/state/error contract. This design brief does not mark SPEC-002 ready or change its ACs.
