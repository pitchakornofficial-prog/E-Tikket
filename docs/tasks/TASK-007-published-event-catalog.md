# TASK-007: Guests can discover and open the selected published event

- Status: todo
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the public catalog and event details against persisted events. Read the owning spec's Catalog and guest order and API contracts, [UI requirements D-01–D-08](../requirement.md#ui-design-requirements), and [CONTEXT.md](../../CONTEXT.md). Accepted [home-v2](../assets/prototype/index.html) and [event-v2](../assets/prototype/event-detail.html) inform hierarchy; TASK-008 owns purchase submission.

## Blocked by

- [TASK-001](TASK-001-app-database-foundation.md)

## Todo

- [ ] Own AC-01 fully and AC-19 partially for catalog/event information; other views are owned by TASK-008–TASK-013 and TASK-015, as recorded in [the coverage map](SPEC-002-task-map.md).
- [ ] Implement GET /api/events and GET /api/events/[id] with the spec's fields, decimal-string THB values and UTC timestamps. Include only PUBLISHED events; missing/unpublished detail is 404 and catalog service failure is 503. Calculate available quantity from paid orders, unexpired pending reservations and waiting verification orders using the canonical inventory rule; TASK-008 must reuse this rule for serialized purchase decisions.
- [ ] Build catalog/detail navigation preserving selected event identity, image/name/date/time/venue/price/description/organizer and availability. Present loading, empty, missing and load-failure states; the purchase entry point leads to that event's future form, without simulating a successful order.
- [ ] Use dark TICKETBOX surfaces, original-color artwork, event-led hierarchy and text/icon statuses. Verify keyboard/focus/labels, readable contrast and mobile/desktop layout against accepted v2 evidence. Do not add event CRUD, scheduled previews, sample data as production state, or prototype toolbars/staff demo transitions.
- [ ] Verify two published events with different details plus draft/archived fixtures: listing/details, identity after selection, missing/unpublished denial, quantity calculation with pending/expired/waiting/paid orders, empty response and service failure. Record browser observations at narrow mobile and desktop widths.
- [ ] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [ ] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

