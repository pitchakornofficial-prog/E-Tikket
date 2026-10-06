# Domain Context

Durable domain understanding, vocabulary, business rules, and invariants for the Event Ticketing Platform.

## Domain Vocabulary & Core Entities
- **Event:** งานแสดงดนตรีหรือคอนเสิร์ตที่จัดขึ้น มีผู้จัดงาน (`Organizer`), สถานที่, วันที่, เวลา, ราคาบัตร, และจำนวนบัตรทั้งหมดที่เปิดขาย
- **User:** ผู้ใช้งานระบบที่ต้องเข้าสู่ระบบ มี 2 บทบาท:
  - `ADMIN`: ผู้ดูแลระบบส่วนกลาง ตรวจสอบความถูกต้องของสลิปโอนเงิน (Approve/Reject) และดูภาพรวมทั้งระบบ
  - `ORGANIZER`: ผู้จัดงาน สร้างและแก้ไขข้อมูลงานของตนเอง และใช้สแกนเนอร์ตรวจสอบบัตรหน้างาน
- **Order:** คำสั่งซื้อบัตรของลูกค้า (Guest Checkout) ระบุจำนวนบัตร ยอดเงินรวม ข้อมูลผู้ซื้อ (ชื่อ, อีเมล, เบอร์โทรศัพท์) มีอายุ 15 นาที และมี `view_token` สำหรับเข้าดูสถานะคำสั่งซื้อและบัตร
- **Payment:** ข้อมูลการชำระเงินของคำสั่งซื้อ ประกอบด้วยรูปสลิป (`slip_url`), แฮชของไฟล์สลิป (`slip_hash`), สถานะ และข้อมูลผู้ตรวจสอบ
- **Ticket:** บัตรเข้างานแต่ละใบ ออกให้เมื่อ Order มีสถานะ `PAID` มี `ticket_number` สำหรับการอ้างอิง และ `qr_token_hash` สำหรับการตรวจสอบสิทธิ์
- **TicketScan:** บันทึกประวัติ (Audit Log) การสแกนบัตรเข้า-ออกหน้างาน ระบุ Action (`CHECK_IN` หรือ `CHECK_OUT`), เวลาที่สแกน, และเจ้าหน้าที่ผู้สแกน

## Invariants & Business Rules
1. **Zero Customer Accounts:** ลูกค้าสั่งซื้อบัตรโดยไม่ต้องลงทะเบียนหรือจำรหัสผ่าน เข้าถึงบัตรผ่าน `view_token` ทางอีเมลเท่านั้น
2. **15-Minute Reservation Lock:** เมื่อลูกค้าสร้าง Order ระบบจะล็อกจำนวนบัตรชั่วคราวเป็นเวลา 15 นาที หากไม่อัปโหลดสลิปในเวลา Order จะกลายเป็น `EXPIRED` และสต็อกจะถูกคืนให้อัตโนมัติ
3. **Admin Verification Gate:** การอัปโหลดสลิปจะเปลี่ยนสถานะ Order เป็น `WAITING_FOR_VERIFY` เท่านั้น สถานะ `PAID` จะเกิดขึ้นได้ต่อเมื่อ Admin ตรวจสอบและกดยืนยัน (Approve) เท่านั้น
4. **Duplicate Slip Prevention:** ห้ามระบบรับสลิปที่มี `slip_hash` ซ้ำกับสลิปที่เคยอนุมัติหรืออยู่ในระบบ
5. **Decoupled Ticket Issuance:** บัตร (`Ticket`) จะถูกสร้างขึ้นก็ต่อเมื่อ Order ได้รับการเปลี่ยนสถานะเป็น `PAID` เท่านั้น 1 Order มีได้หลาย Ticket ตามจำนวนที่สั่งซื้อ
6. **QR Token Cryptographic Integrity:** QR Code แต่ละใบต้องเข้ารหัสลับจาก random 32-byte hex token ที่เดาไม่ได้ และเก็บเฉพาะค่า SHA-256 hash ลงฐานข้อมูล ห้ามใช้ Ticket Number เป็นรหัสสแกนเด็ดขาด
7. **Re-entry State Machine:**
   - เข้าครั้งแรก: `OUTSIDE` -> สแกน `CHECK_IN` -> `INSIDE`
   - ออกชั่วคราว: `INSIDE` -> สแกน `CHECK_OUT` -> `OUTSIDE`
   - กลับเข้างาน: `OUTSIDE` -> สแกน `CHECK_IN` -> `INSIDE`
   - หากบัตรอยู่ในสถานะ `INSIDE` แล้วพยายามสแกน `CHECK_IN` ซ้ำ ระบบจะปฏิเสธด้วยข้อความ `ALREADY CHECKED IN`
8. **Event Scoping:** การสแกนบัตรหน้างานต้องผูกกับ `event_id` ที่กำลังจัดงานอยู่ บัตรของงานอื่นจะถูกปฏิเสธทันที
9. **Platform Fee Calculation:** ทุก Order คำนวณหัก Platform Fee (ค่าเริ่มต้น 5.00%) โดยคำนวณ `platform_fee_amount = total_amount * (platform_fee_percent / 100)` และ `organizer_revenue = total_amount - platform_fee_amount`

## Verification Policy

- Status: confirmed
- Source: explicit setup confirmation
- Confirmed at: 2026-10-06

| Capability | Mode |
| --- | --- |
| `unit-test` | `auto` |
| `integration-test` | `off` |
| `e2e-test` | `off` |
| `code-review` | `required` |
