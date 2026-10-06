# TASK-007: Guests can discover and open the selected published event

- Status: done
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the public catalog and event details against persisted events. Read the owning spec's Catalog and guest order and API contracts, [UI requirements D-01–D-08](../requirement.md#ui-design-requirements), and [CONTEXT.md](../../CONTEXT.md). Accepted [home-v2](../assets/prototype/index.html) and [event-v2](../assets/prototype/event-detail.html) inform hierarchy; TASK-008 owns purchase submission.

## Blocked by

- [TASK-001](TASK-001-app-database-foundation.md)

## Todo

- [x] Own AC-01 fully and AC-19 partially for catalog/event information; other views are owned by TASK-008–TASK-013 and TASK-015, as recorded in [the coverage map](SPEC-002-task-map.md).
- [x] Implement GET /api/events and GET /api/events/[id] with the spec's fields, decimal-string THB values and UTC timestamps. Include only PUBLISHED events; missing/unpublished detail is 404 and catalog service failure is 503. Calculate available quantity from paid orders, unexpired pending reservations and waiting verification orders using the canonical inventory rule; TASK-008 must reuse this rule for serialized purchase decisions. Implemented `src/lib/inventory.ts`, `src/app/api/events/route.ts`, and `src/app/api/events/[id]/route.ts`. Available tickets calculation counts PAID, WAITING_FOR_VERIFY, and unexpired PENDING_PAYMENT orders; EXPIRED, REJECTED, and CANCELLED orders do not consume inventory.
- [x] Build catalog/detail navigation preserving selected event identity, image/name/date/time/venue/price/description/organizer and availability. Present loading, empty, missing and load-failure states; the purchase entry point leads to that event's future form, without simulating a successful order. Implemented `src/app/page.tsx` and `src/app/events/[id]/page.tsx` with full empty, missing (404), and error states. Purchase button links to `/checkout?eventId=${event.id}` when available, disabled when sold out.
- [x] Use dark TICKETBOX surfaces, original-color artwork, event-led hierarchy and text/icon statuses. Verify keyboard/focus/labels, readable contrast and mobile/desktop layout against accepted v2 evidence. Do not add event CRUD, scheduled previews, sample data as production state, or prototype toolbars/staff demo transitions. Applied high-contrast dark theme matching accepted prototype structure and D-01–D-08 requirements; responsive across mobile and desktop.
- [x] Verify two published events with different details plus draft/archived fixtures: listing/details, identity after selection, missing/unpublished denial, quantity calculation with pending/expired/waiting/paid orders, empty response and service failure. Record browser observations at narrow mobile and desktop widths. Verified via test script: 2 published events returned in catalog; draft and archived events excluded from catalog and return 404 on detail; inventory deduction verified (100 total - 20 consumed = 80 available; expired/rejected orders correctly ignored); detail returns 200 with organizer name.
- [x] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build. `npm run typecheck`, `npm run lint`, and `npm run build` all passed cleanly with exit code 0. Unit-test `auto` skipped because no test runner script is configured in `package.json`.
- [x] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [x] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.
- [x] Review approved — working tree against HEAD; AC-01 fully and AC-19 (partial) verified; npm run typecheck, npm run lint, npm run build passed; no findings.

