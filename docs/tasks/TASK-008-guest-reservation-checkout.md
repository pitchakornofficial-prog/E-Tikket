# TASK-008: Guests reserve tickets for 15 minutes and access their private payment summary

- Status: todo
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the event purchase form, atomic reservation and capability-protected checkout. Read the owning spec's order/expiry/capability and API contracts, [CONTEXT.md](../../CONTEXT.md), and [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md). Reuse TASK-007 event/inventory presentation and TASK-006 storage helpers. Accepted [event-v2](../assets/prototype/event-detail.html) and [checkout-v2](../assets/prototype/checkout.html) provide scoped UI evidence.

## Blocked by

- [TASK-006](TASK-006-private-artifact-foundation.md)
- [TASK-007](TASK-007-published-event-catalog.md)

## Todo

- [ ] Own AC-02, AC-03 and AC-04 fully; partial AC-05 (expiry/release/read/timer; expired slip rejection completed by TASK-009), AC-19 (purchase/summary states) and AC-20 (checkout access). Complementary owners are in [the coverage map](SPEC-002-task-map.md).
- [ ] Implement POST /api/orders with trimmed nonempty name/phone, valid email, positive integer quantity, published-event checks and spec 201/422/404/409/503 outcomes. Serialize inventory decisions and persist one PENDING_PAYMENT reservation, its original server expiresAt and authoritative price/configured fee snapshot atomically. Never trust client amount/fee/status or add a ten-ticket cap.
- [ ] Generate a 32-byte checkout capability, persist only its unique SHA-256 hash and return its URL only after confirmed creation. Implement GET /api/orders/[id] with checkout Bearer authorization and uniform 404 denial; return only the contracted order/payment-instruction fields, never admission artifacts/view credentials. Protect checkout responses with private, no-store and no-referrer; keep tokens and buyer data out of ordinary logs.
- [ ] Enforce idempotent expiry of only PENDING_PAYMENT orders at their original 15-minute window and release availability on authoritative reads/writes or bounded maintenance without a scheduler. WAITING_FOR_VERIFY remains reserved; REJECTED no longer consumes inventory. Reload or a capability cannot restart expiry.
- [ ] Connect the guest form to real creation, preserve safe input on failure and navigate only after 201. Show server-owned payment summary, configured bank instructions/optional transfer QR and countdown; display truthful pending/waiting/expired/paid/rejected states without showing admission QR. TASK-009 adds slip submission.
- [ ] Verify invalid fields/quantities, missing/unpublished events and competing last-stock purchases using HTTP requests and database inspection: no overselling or false success. For 399 × 3 at 5%, inspect 1197 total, 59.85 fee and 1137.15 organizer revenue; test another configured fee and tampered client values.
- [ ] Verify controlled-time expiry, repeated reads and browser reload retain the original deadline; waiting orders do not expire. Try orders A/B with missing/mutated/cross-order/view capabilities and readable IDs; inspect uniform denial, response headers and logs. Inspect mobile/desktop form, focus/error states and payment information.
- [ ] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [ ] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

