# TASK-013: Guests open only their own original tickets through the email view link

- Status: done
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver token-scoped View My Tickets without customer login. Read the owning spec's Email and View My Tickets/API/private-storage contracts, [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), and [CONTEXT.md](../../CONTEXT.md). Reuse TASK-011 issued artifacts/view hash; use its prepared link fixture for verification independently of provider delivery. Accepted [tickets-v2](../assets/prototype/tickets.html) supports presentation.

## Blocked by

- [TASK-011](TASK-011-atomic-approval-ticket-issuance.md)

## Todo

- [x] Own AC-12 fully and partial AC-19 (individual ticket/QR presentation) and AC-20 (email-view scope/original redisplay). TASK-012 owns emailed link delivery and resend; TASK-008 owns checkout denial boundary. See [the coverage map](SPEC-002-task-map.md).
- [x] Implement GET /api/tickets/view?token=... validating the hashed email view capability and PAID/issued eligibility; return only its contracted order/event/name and all ticket numbers/current statuses/qrDataUrl. Missing/invalid/checkout capability or non-PAID order produces uniform TICKETS_NOT_FOUND; IDs alone confer no access.
- [x] Read original private R2 QR images after authorization. Return ARTIFACT_UNAVAILABLE without changing ticket credentials when retrieval fails; never expose raw tokens, delivery payload or public object URLs. Use private, no-store and no-referrer for protected API/page responses and suppress capability URLs in ordinary logging/analytics.
- [x] Build /tickets?token=... with large individual scannable QRs, order/event details and authoritative OUTSIDE/INSIDE/CANCELLED status, loading/denial/unavailable states and keyboard-accessible dark TICKETBOX UI. No customer account, fake QR, secret-token label or public staff simulation transition.
- [x] Verify unauthenticated valid access for two different paid orders and denial after swapping/mutating/omitting capabilities, using readable IDs, checkout tokens and non-PAID fixtures. Compare artifact bytes/decoded credentials across fresh reads; inspect updated ticket statuses after database transition and R2 outage without regeneration.
- [x] Inspect mobile/desktop QR readability, text/icon status contrast, focus and response/log/referrer privacy. When TASK-012 is available, open the actual delivered link to confirm it reaches this same protected contract; delivery remains that task's ownership.
- [x] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [x] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [x] Review approved — working tree against HEAD; AC-12, partial AC-19, AC-20 verified; npm run typecheck, npm run lint, npm run build passed; no findings.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.


