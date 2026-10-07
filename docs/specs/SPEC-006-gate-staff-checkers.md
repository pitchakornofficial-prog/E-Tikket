# SPEC-006: Dedicated Gate Staff Checkers & Link Scanner

- Status: ready
- Requirement: [User request — Gate Staff Checkers & Link-based Mobile Scanner via /organizer]
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

Currently, any organizer logging into `/organizer` can directly open a camera scanner and check in tickets. However, event organizers in production hire temporary gate staff, security personnel, or entrance checkers who should not have access to the organizer's management account or financial details. Furthermore, organizers should not be the ones scanning tickets themselves. Instead, organizers need to:
1. Manage specific gate staff/checkers (create, view, copy link, revoke/delete) for their assigned concerts.
2. Delegate mobile scanning strictly via unique, passwordless access links (`/scanner/[token]`).
3. View real-time audit trails detailing which specific gate staff member scanned each ticket, at what time, and what the scan result was.
4. Prevent organizers from scanning directly in `/organizer`.

## In scope

1. **Database Schema:**
   - Add `TicketChecker` model in `prisma/schema.prisma` with `id`, `organizerId`, `eventId`, `name`, `gateNote`, `tokenHash`, `accessToken`, `isActive`, `createdAt`, `updatedAt`.
   - Update `TicketScan` to track `checkerId` and `checkerName`.
2. **API Endpoints:**
   - `GET /api/organizer/checkers`: List checkers for organizer's events with scan counts.
   - `POST /api/organizer/checkers`: Create a new checker and return a secure unique token/link.
   - `DELETE /api/organizer/checkers/[id]`: Revoke/delete a checker.
   - `GET /api/scanner/[token]`: Validate scanner link and return event + staff details.
   - `POST /api/scanner/[token]/checkin`: Perform check-in/check-out scan authenticated via checker token, recording checker name and ID.
3. **Organizer Dashboard (`/organizer`):**
   - Remove direct camera scanner from `/organizer`.
   - Add Gate Staff Management section (list, add modal, copy link, QR modal for mobile, delete).
   - Add Live Scan History & Audit section with staff name, time, ticket number, action, and result.
4. **Dedicated Scanner Page (`/scanner/[token]`):**
   - Mobile-optimized viewfinder page accessible via unique token link without password/account.
   - Real-time QR scanner, Check-in / Check-out toggle, instant visual & sound/haptic feedback, and "สแกนคนถัดไป" button.

## Out of scope

- Customer/buyer accounts.
- Password-protected logins for gate staff (strictly link/token-based).
- Native iOS/Android apps (runs in responsive mobile browser).

## Acceptance Criteria

- AC-01: An authenticated Organizer at `/organizer` can create a dedicated Ticket Checker with Name, assigned Event, and Gate Note.
- AC-02: Each created Ticket Checker receives a unique, secure access link (`/scanner/[token]`) with one-click copy and a QR code dialog for mobile opening.
- AC-03: The Organizer dashboard `/organizer` does NOT allow the organizer to scan directly; instead, it presents checkers management and live scan audit trails.
- AC-04: Opening `/scanner/[token]` with a valid, active token loads the dedicated camera scanner with event info and checker name without requiring login.
- AC-05: Opening `/scanner/[token]` with an invalid or deleted token shows an error explaining that the link is invalid or revoked.
- AC-06: Scanning a ticket via `/scanner/[token]` records the scan in `TicketScan` with the checker's name, time, ticket number, action, and result.
- AC-07: The Organizer dashboard `/organizer` displays the scan history including the staff member's name and timestamp.
- AC-08: Deleting a Ticket Checker in `/organizer` immediately invalidates their scanner link.
- AC-09: All interfaces support monochromatic Light and Dark modes.

## Verification Plan

| AC | Verification |
| --- | --- |
| AC-01, AC-02 | Create a checker in `/organizer` and verify token link generation. |
| AC-03 | Verify `/organizer` has no direct camera and displays checkers + scan logs. |
| AC-04, AC-05 | Open `/scanner/[token]` with valid token, verify scanner loads. Open with invalid token, verify error. |
| AC-06, AC-07 | Scan a ticket from `/scanner/[token]`, verify scan record in DB and in `/organizer` audit table shows checker name. |
| AC-08 | Delete checker in `/organizer`, reload `/scanner/[token]`, verify access is blocked. |
| AC-09 | Test toggle between light and dark mode on both `/organizer` and `/scanner/[token]`. |
