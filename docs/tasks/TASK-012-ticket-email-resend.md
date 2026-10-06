# TASK-012: Approved tickets are emailed and failed delivery can resend the same tickets

- Status: todo
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver initial ticket email and Admin manual resend after the atomic paid commit. Read the owning spec's email/API/delivery-failure contracts, [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), and [CONTEXT.md](../../CONTEXT.md). Extend TASK-010's hybrid transport with TASK-011's retained private payload/original artifacts. Accepted [admin-v2](../assets/prototype/admin-verifications.html) informs delivery feedback.

## Blocked by

- [TASK-011](TASK-011-atomic-approval-ticket-issuance.md)

## Todo

- [ ] Own AC-11 and AC-22 fully; partial AC-19 (delivery/manual resend states) and AC-20 (service-only payload/original artifacts). TASK-006/TASK-011 supply durable preparation; TASK-013 owns the destination page. See [the coverage map](SPEC-002-task-map.md).
- [ ] After successful approval commit, send all purchased original QR tickets, event name/date/time/venue, ticket numbers, quantity/order information and the original /tickets?token=... link through the existing hybrid transport. Private payload is delivery-service-only; redact the capability/QR bytes from ordinary logs while allowing deliberate development email inspection.
- [ ] Persist PENDING/SENT/FAILED with last attempt/sanitized error separately from payment. Record SENT on transport/provider acceptance, not claimed inbox arrival. Failure/timeout/process interruption retains PAID and tickets and remains visible after reload; no partial rollback or regeneration.
- [ ] Implement ADMIN same-origin/CSRF-protected POST /api/admin/verifications/[id]/resend-email for PAID pending/failed delivery. Read the same private payload/view link/original QR artifacts, serialize overlapping attempts (409 DELIVERY_IN_PROGRESS), return ticketsCreated: 0 and truthfully retain failure on 503. Repeated Approve must not invoke resend. Recover unconfirmed attempts without leaving a permanent process-local lock.
- [ ] Connect persisted delivery status and manual resend to verification rows/actions on mobile/desktop. Distinguish approval, delivery pending/failure and accepted send with text/icons; preserve layout and accessible busy/error states. Do not add scheduled retries, queues or an exact-once external-email promise.
- [ ] Verify required email content for every purchased ticket and decode each original QR. Inject provider rejection/timeout and interruption around send/state persistence; reload Admin, resend successfully, fail retry again and overlap requests. Compare unchanged ticket IDs/count, QR bytes and view link; inspect persisted outcomes and no secrets in ordinary logs. Observe guest/ORGANIZER and cross-origin resend denial.
- [ ] Verify configured production transport with attributable provider evidence when available; record absent provider credentials or live acceptance as an external verification blocker rather than substituting a development console result.
- [ ] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [ ] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

