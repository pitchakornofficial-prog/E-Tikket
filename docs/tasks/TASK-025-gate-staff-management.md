# TASK-025: Gate Staff Checkers Model, API & Organizer Dashboard

- Status: done
- Spec: [docs/specs/SPEC-006-gate-staff-checkers.md](../../docs/specs/SPEC-006-gate-staff-checkers.md)

## Goal

Extend the Prisma schema with `TicketChecker` and update `TicketScan` to track `checkerId` and `checkerName`. Build the Organizer API endpoints to create, list, and delete checkers. Refactor `/organizer` to remove the direct camera scanner, replacing it with the Gate Staff Management panel (with token generation, link copying, QR code for mobile) and the live scan audit trail showing checker names and timestamps.

Read:
- [docs/specs/SPEC-006-gate-staff-checkers.md](../../docs/specs/SPEC-006-gate-staff-checkers.md)

## Blocked by

- None

## Todo

- [x] Update `prisma/schema.prisma` with `TicketChecker` model and relations to `User` (organizer), `Event`, and `TicketScan`. Add `checkerId` and `checkerName` to `TicketScan`.
- [x] Run `npx prisma db push` or migration to sync schema.
- [x] Implement `GET /api/organizer/checkers` and `POST /api/organizer/checkers` to list and create checkers with secure CSPRNG tokens.
- [x] Implement `DELETE /api/organizer/checkers/[id]` to delete/revoke a checker.
- [x] Update `GET /api/organizer/checkin/recent` to include `checkerName` in the scan records.
- [x] Refactor `src/app/organizer/page.tsx` into the Gate Staff & Scan Audit Dashboard:
  - Remove direct camera scanner (AC-03).
  - Add Add Checker modal and list with copy link, show QR dialog, and delete button (AC-01, AC-02, AC-08).
  - Add Scan Audit trail table showing staff name and timestamp (AC-07).
  - Ensure full Light & Dark mode support (AC-09).
- [x] Typecheck and verify compilation.

