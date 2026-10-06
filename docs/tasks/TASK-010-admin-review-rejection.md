# TASK-010: Admin can privately inspect a payment and reject it with truthful notification

- Status: todo
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the bounded verification list, real protected slip inspection and rejection flow. Read the owning spec's Admin review/API/failure contracts, [CONTEXT.md](../../CONTEXT.md), and [workflow](../workflow.md); reuse staff session/role protection and TASK-009 evidence. Accepted [admin-v2](../assets/prototype/admin-verifications.html) supplies D-06 layout evidence. TASK-011 owns approval; TASK-012 owns ticket email/resend.

## Blocked by

- [TASK-009](TASK-009-payment-slip-submission.md)
- [TASK-005](TASK-005-staff-login-interface.md)

## Todo

- [ ] Own AC-07 and AC-09 fully; partial AC-19 (review/rejection layout/states) and AC-20 (authorized private slip reading). Complementary owners are in [the coverage map](SPEC-002-task-map.md).
- [ ] Implement GET /api/admin/verifications as ADMIN only, listing WAITING_FOR_VERIFY and PAID orders with PENDING/FAILED delivery using the contracted buyer/event/quantity/amount/status fields. Retrieve actual slip bytes after server authorization; do not expose public URLs, unrelated order history or ticket secrets. Provide loading, empty, unavailable and access-denied UI.
- [ ] Implement same-origin/CSRF-protected POST /api/admin/verifications/[id]/reject with server-derived reviewer/time, atomic REJECTED payment/order, zero tickets and released reservation. No reason is mandatory. Repeated rejection returns existing outcome without repeated notification; deny invalid states and handle concurrent decisions without overriding paid approval.
- [ ] Introduce the shared hybrid email transport boundary for rejection notification (development console output, configured SMTP/Resend production transport). Attempt the actual notification after commit; report observed failure without reverting REJECTED or claiming delivery. Redact secrets from logs; TASK-012 extends this transport with private ticket-email payloads, not a second adapter.
- [ ] Build order alongside slip on desktop and order → slip → actions on mobile, with dark TICKETBOX surfaces and text/icons. Provide the review destination from the authenticated staff landing page; connect rejection to confirmed server results. Do not provide a fake Approve success while TASK-011 is pending.
- [ ] Verify ADMIN inspection of real private bytes and guest/ORGANIZER denial for list/slip/decision access, including forged reviewer and cross-origin mutation. Reject and repeat rejection; inspect reviewer/time, released inventory, zero tickets and notification content. Inject notification and pre-commit failure and confirm truthful states; inspect layout/focus/error states at mobile/desktop widths.
- [ ] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [ ] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

