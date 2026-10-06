# Domain Context

Durable domain understanding, vocabulary, business rules, and invariants for the Event Ticketing Platform.

## Domain Vocabulary & Core Entities
- **Event:** งานแสดงดนตรีหรือคอนเสิร์ตที่จัดขึ้น มีผู้จัดงาน (`Organizer`), สถานที่, วันที่, เวลา, ราคาบัตร, และจำนวนบัตรทั้งหมดที่เปิดขาย
- **User:** ผู้ใช้งานระบบที่ต้องเข้าสู่ระบบ มี 2 บทบาท:
  - `ADMIN`: ผู้ดูแลระบบส่วนกลาง ตรวจสอบความถูกต้องของสลิปโอนเงิน (Approve/Reject) และดูภาพรวมทั้งระบบ
  - `ORGANIZER`: ผู้จัดงาน สร้างและแก้ไขข้อมูลงานของตนเอง และใช้สแกนเนอร์ตรวจสอบบัตรหน้างาน
- **Order:** คำสั่งซื้อบัตรของลูกค้า (Guest Checkout) ระบุจำนวนบัตร ยอดเงินรวม ข้อมูลผู้ซื้อ (ชื่อ, อีเมล, เบอร์โทรศัพท์) มีระยะเวลาจองในสถานะ `PENDING_PAYMENT` 15 นาที ใช้ checkout token สำหรับหน้าชำระเงิน/สถานะคำสั่งซื้อและอัปโหลดสลิป แยกจาก `view_token` สำหรับเปิดบัตรผ่านลิงก์ทางอีเมล ([ADR-0002](docs/adr/0002-ticket-artifacts-guest-access-and-scan-audit.md))
- **Payment:** ข้อมูลการชำระเงินของคำสั่งซื้อ ประกอบด้วยรูปสลิป (`slip_url`), แฮชของไฟล์สลิป (`slip_hash`), สถานะ และข้อมูลผู้ตรวจสอบ
- **Ticket:** บัตรเข้างานแต่ละใบ ออกให้เมื่อ Order มีสถานะ `PAID` มี `ticket_number` สำหรับการอ้างอิง และ `qr_token_hash` สำหรับการตรวจสอบสิทธิ์
- **TicketScan:** บันทึกประวัติ (Audit Log) ทุกความพยายามสแกนบัตรเข้า-ออกหน้างาน ทั้งผ่านและไม่ผ่าน ระบุ Action (`CHECK_IN` หรือ `CHECK_OUT`), เวลา, เจ้าหน้าที่, งาน และผลลัพธ์ โดย ticket association ว่างได้เมื่อไม่พบบัตร ([ADR-0002](docs/adr/0002-ticket-artifacts-guest-access-and-scan-audit.md))
- **Article:** บทความ/ข่าวสำหรับ SEO เขียนโดย Admin หรือ Organizer มี title, slug (URL-friendly, editable), เนื้อหา rich text, cover image, SEO metadata (title, description, OG image), เชื่อมโยง Category, Tag, และ Event ที่เกี่ยวข้องได้ สถานะ: `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `ARCHIVED`
- **ArticleCategory:** หมวดหมู่บทความ จัดการโดย Admin เท่านั้น (CRUD) ใช้จัดกลุ่มบทความ เช่น "ข่าวอีเวนต์", "รีวิวคอนเสิร์ต"
- **ArticleTag:** แท็กบทความ เป็น free-form สร้างขณะเขียนบทความ ระบบเสนอ tag ที่เคยใช้แล้ว (autocomplete)

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
10. **Separate Guest Capabilities:** checkout token ให้สิทธิ์เฉพาะหน้าชำระเงิน/สถานะคำสั่งซื้อและการส่งสลิปที่ยังมีสิทธิ์ส่ง ไม่ให้สิทธิ์เปิด QR บัตร; `view_token` ที่ส่งทางอีเมลใช้สำหรับเปิดบัตรของ Order นั้น ทั้งสองไม่ใช่ staff session และเลข Order อย่างเดียวไม่ใช่สิทธิ์เข้าถึง ([ADR-0002](docs/adr/0002-ticket-artifacts-guest-access-and-scan-audit.md))
11. **Protected QR Redisplay:** ภาพ QR เดิมเก็บใน R2 แบบ private แอปตรวจสิทธิ์ก่อนส่งภาพ ส่วนฐานข้อมูลเก็บเพียง hash ของ QR token และตำแหน่งไฟล์ ภาพ QR เป็นข้อมูลลับที่ใช้ผ่านประตูได้ ([ADR-0002](docs/adr/0002-ticket-artifacts-guest-access-and-scan-audit.md))
12. **Every Scan Is Auditable:** บันทึกทุก scan รวมถึงบัตรซ้ำ, action ที่ไม่ถูกต้อง, บัตรยกเลิก, ผิดงาน, ยังไม่จ่ายเงิน และไม่พบบัตร โดยการบันทึกเหตุการณ์ไม่ทำให้การสแกนที่ถูกปฏิเสธเปลี่ยนสถานะบัตร ([ADR-0002](docs/adr/0002-ticket-artifacts-guest-access-and-scan-audit.md))
13. **Approval and Delivery Failure:** กติกาเมื่อเตรียม QR/ออกบัตรล้มเหลว และเมื่อส่งอีเมลล้มเหลว ยึด [Confirmed Purchase and Entry Decisions](docs/requirement.md#confirmed-purchase-and-entry-decisions); การส่งใหม่ต้องใช้บัตรเดิมและไม่ออกบัตรซ้ำ
14. **Article Approval Gate:** บทความของ Organizer ต้องผ่าน Admin approve ก่อนเผยแพร่ (DRAFT → PENDING_REVIEW → PUBLISHED) ส่วนบทความของ Admin เผยแพร่ได้ทันที (DRAFT → PUBLISHED)
15. **Organizer Edit Reverts Review:** เมื่อ Organizer แก้ไขบทความที่ PUBLISHED แล้ว สถานะจะเปลี่ยนเป็น PENDING_REVIEW อัตโนมัติ Admin แก้ไขบทความใดก็ได้โดยคง PUBLISHED
16. **Admin Article Superuser:** Admin จัดการบทความทั้งหมดได้ (แก้ไข, ลบ, unpublish) รวมถึงบทความของ Organizer

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
