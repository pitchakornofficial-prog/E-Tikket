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
