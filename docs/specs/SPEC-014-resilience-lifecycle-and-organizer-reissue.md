# SPEC-014: Operational Resilience, Event Lifecycle, and Organizer Ticket Reissue

- Status: in_progress
- Requirement: [docs/requirement.md](../../docs/requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

1. **Organizer Support for Leaked or Lost Tickets:**
   - While customers can self-serve reissue their leaked QR code once from their ticket page, customers who lose email access or contact event staff by phone/Line need the Organizer to cancel the compromised ticket and issue a new replacement ticket directly from the dashboard.
2. **Event Catalog Lifecycle & Past Events Management:**
   - Once a concert's event date passes, the event still clutters the public catalog alongside upcoming events. The catalog needs clear separation between "Upcoming Events (งานที่จะมาถึง)" and "Past Events (งานที่จบไปแล้ว)".
3. **Gate Scanner Offline Connectivity Resilience:**
   - In crowded or underground concert venues where cellular/Wi-Fi connection may drop, gate checkers need a clear real-time online/offline connection indicator so they don't scan blindly when network requests cannot succeed.

## In scope

1. **Organizer Manual Ticket Reissue:**
   - API `POST /api/organizer/events/[id]/reissue` allowing the authenticated organizer to cancel an attendee's un-scanned ticket and issue a fresh replacement QR ticket.
   - UI button and confirmation dialog in `/organizer/events` under the orders/tickets view.
2. **Public Catalog Past Events Filtering:**
   - Filter tab in `src/components/event-catalog-browser.tsx` and `/` separating Upcoming vs Past Events based on event date.
3. **Scanner Online/Offline Network Status Indicator:**
   - Real-time connectivity banner/badge in `src/app/scanner/[token]/page.tsx` and `src/components/organizer-scanner.tsx` with offline warning and auto-reconnection feedback.

## Out of scope

- Automated refund processing.
- Full offline sync database (requires IndexedDB/ServiceWorker queue, outside MVP).

## Acceptance Criteria

- **AC-01:** `POST /api/organizer/events/[id]/reissue` verifies organizer ownership, cancels the specified un-scanned ticket, and generates a new replacement ticket with new CSPRNG QR secret.
- **AC-02:** Organizer orders view in `/organizer/events` includes a button to reissue tickets for attendees with clear confirmation.
- **AC-03:** Event Catalog (`/`) allows users to filter/toggle between Upcoming Events and Past Events.
- **AC-04:** Mobile Gate Scanner (`/scanner/[token]`) displays a live network connection status badge (Online/Offline) and warns staff when disconnected.
- **AC-05:** All UI components adhere to the monochromatic high-contrast black & white design system.
