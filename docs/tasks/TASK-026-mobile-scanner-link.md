# TASK-026: Mobile Scanner Page via Link & Checkin API

- Status: done
- Spec: [docs/specs/SPEC-006-gate-staff-checkers.md](../../docs/specs/SPEC-006-gate-staff-checkers.md)

## Goal

Implement the dedicated mobile scanner interface at `/scanner/[token]` that is accessed exclusively via the unique checker token link without requiring user authentication. Implement the check-in API endpoint `/api/scanner/[token]/checkin` that validates the token, executes check-in or check-out, and attributes the scan record to the specific checker.

Read:
- [docs/specs/SPEC-006-gate-staff-checkers.md](../../docs/specs/SPEC-006-gate-staff-checkers.md)

## Blocked by

- [TASK-025-gate-staff-management.md](TASK-025-gate-staff-management.md)

## Todo

- [x] Implement `GET /api/scanner/[token]` to validate the checker token and return event details and checker name. Return 404/403 for invalid or deleted tokens (AC-04, AC-05).
- [x] Implement `POST /api/scanner/[token]/checkin` to perform ticket verification (CHECK_IN and CHECK_OUT), recording `checkerId`, `checkerName`, and the organizer's `staffId` in `TicketScan` (AC-06).
- [x] Create `src/app/scanner/[token]/page.tsx`:
  - Full mobile-optimized viewfinder with camera streaming and QR decoding.
  - Header showing Event Name, Date, Venue, and Checker Name + Gate position.
  - Scan action toggle (CHECK_IN / CHECK_OUT).
  - Instant visual and audio/haptic feedback panel with "สแกนคนถัดไป" acknowledgment button.
  - Friendly error screen when token is invalid or deleted.
- [x] Update `src/middleware.ts` to allow `/scanner/:path*` and `/api/scanner/:path*` as public token-gated routes without requiring `e-tikket-session` cookie.
- [x] Verify light/dark theme support (AC-09).
- [x] Typecheck and lint validation.

