# TASK-028: Organizer Concerts Management Page & Buyer History

- Status: done
- Spec: [docs/specs/SPEC-007-organizer-events-and-audit.md](../../docs/specs/SPEC-007-organizer-events-and-audit.md)

## Goal

Implement the Organizer Concerts Management page at `/organizer/events` with detailed sales KPIs, buyer history table, attendance statistics, CSV export, and navigation integration. Build `GET /api/organizer/events` and `GET /api/organizer/events/[id]`.

Read:
- [docs/specs/SPEC-007-organizer-events-and-audit.md](../../docs/specs/SPEC-007-organizer-events-and-audit.md)

## Blocked by

- [TASK-027-per-concert-scan-audit.md](TASK-027-per-concert-scan-audit.md)

## Todo

- [x] Add "จัดการคอนเสิร์ต" navigation tab in `src/components/organizer-nav.tsx` (AC-03).
- [x] Create `src/app/api/organizer/events/route.ts` to return events assigned to the organizer with sales statistics (soldTickets, totalTickets, totalRevenue, organizerRevenue, checkersCount) (AC-04).
- [x] Create `src/app/api/organizer/events/[id]/route.ts` to return detailed event data, orders (with customer name, email, phone, quantity, totalAmount, status, tickets), and attendance rate (AC-05, AC-07).
- [x] Create `src/app/organizer/events/page.tsx`:
  - Overview KPI cards (Total events, Tickets sold, Net revenue).
  - Concert cards with status badge, progress bar, price, venue, date/time, and action buttons.
  - Event Details modal showing buyer history with search, status filter, and Export CSV button (AC-05, AC-06).
  - Full Light and Dark mode styling (AC-08).
- [x] Typecheck, lint, and verify execution.
