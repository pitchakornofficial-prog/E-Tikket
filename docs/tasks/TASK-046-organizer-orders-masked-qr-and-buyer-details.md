# TASK-046: Organizer Buyer Orders Privacy, Security-Masked QR Code, & Door Decoupling

- Status: done
- Spec: [SPEC-015-dual-posters-student-privilege-and-gate-delegation.md](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)

## Goal

In `/organizer/orders` (`org-orders-v5`), display strictly buyer and financial order details, completely decouple and remove "สถานะเข้างาน (Door Status)" and `INSIDE`/`OUTSIDE` badges, and render the ticket entry QR code in a security-masked/blurred container (`🔒 QR Code ถูกปิดซ่อนไว้`) to prevent ticket leaks and protect attendee privacy (AC-08, AC-09, AC-10, AC-16).

Authoritative references:
- Spec: [SPEC-015](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)
- Context: [CONTEXT.md](../../CONTEXT.md) (Invariant 20)
- Prototypes: `org-orders-v5`

## Blocked by

- TASK-044

## Todo

- [x] Update `/organizer/orders` page (`src/app/organizer/orders/page.tsx` or equivalent attendee view) to display strictly buyer and order details: Order ID, Buyer Name, Email, Phone, Event, Ticket Tier, Ticket Reference, Quantity, Total Paid, and Payment Method.
- [x] Remove the "สถานะเข้างาน (Door Status)" column, gate scan times, and `INSIDE`/`OUTSIDE` badges completely from the organizer orders table.
- [x] In the order details modal, replace raw QR code rendering with a security-masked container featuring blurred background visual, lock icon, and notice: `🔒 QR Code ถูกปิดซ่อนไว้ (Security Masked)`.
- [x] Display only the plain Ticket Reference (e.g. `TK-88210-01`) instead of an unmasked scannable QR code.
- [x] Update quick stats cards to focus on commercial order KPIs: Total Tickets Sold, Paid Orders, and Total Revenue (instead of door check-in attendance).
- [x] Update filter pills to filter by Ticket Tiers (`ทั้งหมด`, `บัตรทั่วไป`, `ส่วนลดนักศึกษา @ubu`) instead of door statuses.
- [x] Ensure CSV export downloads buyer and order data without door status columns.
- [x] Verify DOM and API output contains no door status elements and QR code is protected via component test and typecheck (`npm run typecheck`).
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
