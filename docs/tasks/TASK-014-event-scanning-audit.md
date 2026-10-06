# TASK-014: Authorized event scans change ticket state and audit every domain result atomically

- Status: done
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the Organizer scan service/API and scoped persisted audit reads needed by the scanner. Read the owning spec's Check-in flow, scan result vocabulary/API and concurrency rules, [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), and [CONTEXT.md](../../CONTEXT.md). Reuse TASK-004 server authorization, TASK-006 audit schema and TASK-011 issued credentials. TASK-015 owns camera/UI and visible feedback.

## Blocked by

- [TASK-011](TASK-011-atomic-approval-ticket-issuance.md)
- [TASK-004](TASK-004-staff-route-protection.md)

## Todo

- [x] Own server portions of AC-13–AC-18, completed jointly with TASK-015's visible feedback; TASK-006 supplies AC-18 schema. Complete AC-10's ticket-number scan denial jointly with TASK-011's secure issuance and TASK-006 representation; partial AC-20 covers absence of raw tokens/private data in scan responses/logs. See [the coverage map](SPEC-002-task-map.md).
- [x] Implement same-origin/CSRF-protected POST /api/organizer/checkin with validated eventId, qrToken and CHECK_IN/CHECK_OUT. Require authenticated ORGANIZER ownership of the selected event, deriving staff from the session. Deny unauthenticated/unauthorized/malformed requests with 401/403/422 before private ticket lookup/disclosure and without fabricated unauthenticated audit rows.
- [x] Hash the scanned secret and validate known ticket, selected event, PAID order and cancellation. Return spec VALID/ALREADY_CHECKED_IN/INVALID_ACTION/CANCELLED/WRONG_EVENT/UNPAID/INVALID vocabulary and only safe contracted event/action/time/ticket fields; wrong-event/unpaid/unknown results must not reveal other buyers or raw credentials.
- [x] Atomically persist authorized well-formed domain attempts and any OUTSIDE→INSIDE or INSIDE→OUTSIDE change, with selected event/staff/time/action/result and known ticket relation (null for unknown). Serialize/CAS concurrent transitions: repeated CHECK_IN cannot enter twice; OUTSIDE CHECK_OUT is INVALID_ACTION. Audit persistence failure rolls back transition and returns SCAN_UNCONFIRMED.
- [x] Provide minimal ownership-scoped event selection/recent scan data through protected server reads for TASK-015, including persisted successful and rejected results and empty state. No unrestricted history endpoint, reports/KPIs, live synchronization requirement or event-management UI.
- [x] Verify own/foreign event and staff identity forgery, no session/wrong role, cross-origin mutation and malformed action denial. Scan unknown, ticket-number-only, wrong-event, unpaid and cancelled fixtures: unchanged state, correct safe result and attributable audit where authorized/well-formed.
- [x] Verify CHECK_IN→CHECK_OUT→CHECK_IN, duplicate CHECK_IN, OUTSIDE CHECK_OUT and competing CHECK_IN requests: exactly one VALID transition and a duplicate result. Inspect selected versus actual event, null unknown association, staff/action/time/result and scoped recent reads. Inject audit/DB failure and inspect rollback/503 with no admission claim or raw secret in database/logs.
- [x] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [x] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [x] Review approved — working tree `src/app/api/organizer/checkin/route.ts` and `src/app/api/organizer/checkin/recent/route.ts` against `HEAD`; server portions of AC-13–AC-18, AC-10 ticket-number scan denial, and AC-20 scan secret/data privacy verified; `npm run typecheck`, `npm run lint`, `npm run build`, and `scratch/verify-task-014.ts` passed cleanly; no findings.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

