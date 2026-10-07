# SPEC-007: Organizer Concerts Management & Per-Concert Scan Audit

- Status: ready
- Requirement: [User request — Organizer Concerts Management page & Per-Concert Live Scan Audit Trail]
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

Currently, event organizers do not have a dedicated concert management dashboard under `/organizer/events` to view their assigned concerts, sales KPIs, revenue, ticket buyer details, and attendance rates. Furthermore, on the Live Scan Audit Trail in `/organizer`, scan records are not easily filterable by individual concert, and the table does not display which concert each scan belongs to when viewing scans.

Completing this feature produces:
1. A per-concert and all-concert filter in the Live Scan Audit Trail on `/organizer`, with a dedicated "คอนเสิร์ต (Concert)" column in the audit table.
2. A dedicated Organizer Concerts Management page at `/organizer/events` accessible via a new "จัดการคอนเสิร์ต" navigation tab.
3. Event details view for organizers showing buyer history (customer name, email, phone, tickets, purchase time, payment status) and check-in attendance stats.
4. Export buyer list to CSV for the organizer's assigned concerts.

## In scope

1. **Live Scan Audit Trail Filter & Column (`/organizer`):**
   - Update `GET /api/organizer/checkin/recent` to support `eventId=ALL` returning recent scans across all events owned by the organizer, with `eventName` included in each record.
   - Add concert selector tabs directly within the Live Scan Audit Trail section on `/organizer`.
   - Add a "งานคอนเสิร์ต" column to the scan table.
2. **Organizer Concerts Management (`/organizer/events`):**
   - Navigation: Add "จัดการคอนเสิร์ต" tab to `OrganizerNav`.
   - API: `GET /api/organizer/events` returning events owned by the organizer with sales statistics (soldTickets, totalTickets, organizerRevenue, totalRevenue, gateStaffCount).
   - API: `GET /api/organizer/events/[id]` returning detailed event data, orders list (customer name, email, phone, quantity, totalAmount, status, tickets, createdAt), and attendance metrics.
   - UI Page: `src/app/organizer/events/page.tsx` displaying:
     - Overview KPI cards (Total assigned events, Tickets sold, Net organizer revenue).
     - Event cards with status badge, poster, venue, date/time, price, progress bar, and action buttons.
     - Modal / view for buyer and purchase history with real-time search, status filter, and Export CSV button.
3. **Themes:** Monochromatic B&W with full Light & Dark mode support.

## Out of scope

- Creating or deleting events by organizers (administrators remain responsible for creating events and assigning organizers).
- Editing financial commission fee rates.

## Acceptance Criteria

- AC-01: An authenticated Organizer at `/organizer` can filter the Live Scan Audit Trail by individual concert or view all concerts combined.
- AC-02: The Live Scan Audit Trail table displays the concert name for every scan record.
- AC-03: `OrganizerNav` includes an active "จัดการคอนเสิร์ต" link leading to `/organizer/events`.
- AC-04: `/organizer/events` displays all concerts assigned to the logged-in organizer with sales counts and revenue.
- AC-05: Clicking "ดูรายละเอียด & ผู้ซื้อ" on an event displays the full buyer list (name, email, phone, tickets, order date, order status) and check-in stats.
- AC-06: The organizer can export the buyer list for an event to CSV.
- AC-07: Organizers cannot access or view events belonging to other organizers.
- AC-08: All new pages support Light and Dark modes.

## Verification Plan

| AC | Verification |
| --- | --- |
| AC-01, AC-02 | Select different events and "ALL" on `/organizer` scan trail, assert table updates and shows concert name column. |
| AC-03, AC-04 | Navigate to `/organizer/events`, assert assigned concerts load with accurate metrics. |
| AC-05, AC-06 | Open buyer modal, verify order details match database, click Export CSV and verify file download. |
| AC-07 | Verify API rejects request for event owned by another organizer with 403 Forbidden. |
| AC-08 | Verify theme toggle across `/organizer/events`. |
