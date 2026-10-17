# TASK-047: Organizer Gate Staff Delegation & Multi-Filter Live Scan Audit Stream

- Status: done
- Spec: [SPEC-015-dual-posters-student-privilege-and-gate-delegation.md](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)

## Goal

Implement the Gate Staff Management interface in `/organizer/scanner` (adding staff, assigning gates, generating `/scanner/[token]` links & PINs, toggling active/revoked status, enforcing scanner-only route restrictions) and provide the Live Scan Audit Stream with real-time multi-dimensional filters across keyword search, result pills, gate dropdown, and staff dropdown (AC-11, AC-12, AC-13, AC-14, AC-15, AC-16).

Authoritative references:
- Spec: [SPEC-015](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)
- Context: [CONTEXT.md](../../CONTEXT.md) (Invariant 19)
- Prototypes: `org-scanner-v5`, `scanner-v4`

## Blocked by

- TASK-044

## Todo

- [x] Ensure `TicketChecker` model in `prisma/schema.prisma` and endpoints (`/api/organizer/checkers`) support assigning gates, generating secure unique tokens, and setting 4-digit PINs.
- [x] Implement the Gate Staff Management section in `/organizer/scanner` (`src/app/organizer/scanner/page.tsx` or component) allowing organizers to add staff with Name, Phone, and Gate station.
- [x] Enforce security boundary: Verify that `/scanner/[token]` restricts staff solely to the mobile camera viewfinder and rejects any attempts to access `/organizer/*` or `/admin/*` routes.
- [x] Provide one-click token link copy, PIN display, and an `ACTIVE` / `REVOKED` status toggle that immediately terminates revoked staff access.
- [x] Implement the Live Scan Audit Stream table showing real-time scan logs with timestamp, action (`CHECK_IN`/`CHECK_OUT`), attendee name & tier, ticket reference, gate station, staff member name, and verification result.
- [x] Build the multi-dimensional filter bar with real-time client/server filtering by:
  - Keyword search (Ticket #, Attendee Name, Staff Name)
  - Action pills (`ALL`, `CHECK_IN`, `CHECK_OUT`, `REJECTED/INVALID`)
  - Gate dropdown (`ALL`, `Gate 1`, `Gate 2`, `VIP Gate`)
  - Staff dropdown (`ALL`, and individual staff members)
- [x] Test staff token creation, gate restriction, and token revocation via integration tests.
- [x] Test real-time filter combinations on scan audit stream with component tests and typecheck (`npm run typecheck`).
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
