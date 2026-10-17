# TASK-045: Admin-Controlled Student Privilege & Checkout OTP Verification Flow

- Status: done
- Spec: [SPEC-015-dual-posters-student-privilege-and-gate-delegation.md](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)

## Goal

Enforce role-based Student Privilege permissions where the toggle is locked/disabled for Organizers and active exclusively for Platform Admins, and implement the customer checkout Step 3 6-digit OTP verification for `@ubu.ac.th` emails to unlock the student discount price (AC-03, AC-04, AC-06, AC-07, AC-16).

Authoritative references:
- Spec: [SPEC-015](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)
- Context: [CONTEXT.md](../../CONTEXT.md) (Invariant 18)
- Prototypes: `org-events-v5`, `admin-events-v4`, `checkout-v5`

## Blocked by

- TASK-044

## Todo

- [x] Add `student_discount_active` (boolean, default false) and `student_price` (Decimal, nullable) to `Event` schema if not already present.
- [x] Enforce API authorization rule in `POST /api/organizer/events` and `PUT /api/organizer/events/[id]` rejecting or ignoring any attempts by organizers to activate `student_discount_active`.
- [x] Update `/organizer/events` modal with a disabled, locked Student Privilege box and explanation badge: `🔒 สิทธิ์เฉพาะแอดมิน (Admin Only) - ผู้จัดไม่สามารถเปิดเองได้`.
- [x] Update `/admin/events` modal with an active toggle for Student Privilege, student discount price input, and `@ubu.ac.th` OTP domain bind.
- [x] Implement backend OTP generation and verification endpoints (`POST /api/checkout/otp/request` and `POST /api/checkout/otp/verify`) scoped to institutional email domains (`@ubu.ac.th`).
- [x] Update `/checkout` (`src/app/checkout/page.tsx`) with Step 3 OTP verification, rendering 6 separate digit boxes and a 10-minute reservation countdown timer upon OTP request.
- [x] Connect checkout price calculation to apply student discount only when the `@ubu.ac.th` email has passed OTP verification.
- [x] Verify organizer API rejects student privilege activation with unit/integration test.
- [x] Verify admin API permits student privilege activation and checkout OTP unlocks student price through integration tests and typecheck (`npm run typecheck`).
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
