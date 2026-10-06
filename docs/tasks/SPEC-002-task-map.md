# SPEC-002 task coverage and dependency map

Planning artifact for [SPEC-002](../specs/SPEC-002-ticket-purchase-and-entry.md), status `ready`, using the six explicitly accepted v2 revisions. Created 2026-10-06 (Asia/Bangkok). This map records planned ownership, not implementation or passing verification. Individual task checklists own future evidence/status.

## Task slices

| Task | Behavioral outcome | Direct prerequisites |
| --- | --- | --- |
| [TASK-006](TASK-006-private-artifact-foundation.md) | Private guest credentials, original ticket artifacts and rejected scan attempts have a durable, private representation | [TASK-001](TASK-001-app-database-foundation.md) |
| [TASK-007](TASK-007-published-event-catalog.md) | Guests can discover and open the selected published event | [TASK-001](TASK-001-app-database-foundation.md) |
| [TASK-008](TASK-008-guest-reservation-checkout.md) | Guests reserve tickets for 15 minutes and access their private payment summary | [TASK-006](TASK-006-private-artifact-foundation.md), [TASK-007](TASK-007-published-event-catalog.md) |
| [TASK-009](TASK-009-payment-slip-submission.md) | Guests submit a valid unique slip and wait for Admin verification | [TASK-008](TASK-008-guest-reservation-checkout.md) |
| [TASK-010](TASK-010-admin-review-rejection.md) | Admin can privately inspect a payment and reject it with truthful notification | [TASK-009](TASK-009-payment-slip-submission.md), [TASK-005](TASK-005-staff-login-interface.md) |
| [TASK-011](TASK-011-atomic-approval-ticket-issuance.md) | Admin approval atomically issues exactly the purchased original QR tickets | [TASK-010](TASK-010-admin-review-rejection.md) |
| [TASK-012](TASK-012-ticket-email-resend.md) | Approved tickets are emailed and failed delivery can resend the same tickets | [TASK-011](TASK-011-atomic-approval-ticket-issuance.md) |
| [TASK-013](TASK-013-guest-ticket-view.md) | Guests open only their own original tickets through the email view link | [TASK-011](TASK-011-atomic-approval-ticket-issuance.md) |
| [TASK-014](TASK-014-event-scanning-audit.md) | Authorized event scans change ticket state and audit every domain result atomically | [TASK-011](TASK-011-atomic-approval-ticket-issuance.md), [TASK-004](TASK-004-staff-route-protection.md) |
| [TASK-015](TASK-015-mobile-scanner-feedback.md) | Organizer scans real QR tickets and acknowledges clear below-camera results | [TASK-014](TASK-014-event-scanning-audit.md), [TASK-005](TASK-005-staff-login-interface.md) |

All ten new tasks start `todo`, with unchecked work/verification/review/conditional commit items. Existing TASK-001–TASK-005 are preserved. TASK-001 and TASK-002 are recorded `done`; TASK-003–TASK-005 remain `todo`. TASK-006 is a necessary shared schema/private-storage prerequisite under ADR-0002; TASK-014 delivers an independently verifiable atomic scan/API/audit boundary before real camera integration in TASK-015. Other slices cross persistence, service, endpoint and relevant UI boundaries.

## Acceptance coverage

Every active AC is assigned. Multiple owners below contribute the stated portions jointly; none of those partial owners independently claims completion of the entire criterion. Supporting prerequisites remain owned once, rather than recreated by later tasks.

| Source criterion | Owners | Ownership / completion boundary |
| --- | --- | --- |
| AC-01 | [TASK-007](TASK-007-published-event-catalog.md) | Published catalog/details and selected-event identity. |
| AC-02 | [TASK-008](TASK-008-guest-reservation-checkout.md) | Guest reservation and private payment summary. |
| AC-03 | [TASK-008](TASK-008-guest-reservation-checkout.md) | Validation and serialized inventory rejection. |
| AC-04 | [TASK-008](TASK-008-guest-reservation-checkout.md) | Server price/fee snapshot and tamper resistance. |
| AC-05 | [TASK-008](TASK-008-guest-reservation-checkout.md), [TASK-009](TASK-009-payment-slip-submission.md) | 008: original expiry/release/timer; 009: expired-upload and expiry/upload race gate. |
| AC-06 | [TASK-009](TASK-009-payment-slip-submission.md) | Valid private slip submission, duplicate prevention and failure immutability. |
| AC-07 | [TASK-010](TASK-010-admin-review-rejection.md) | ADMIN-only real order/slip inspection and decision authorization. |
| AC-08 | [TASK-011](TASK-011-atomic-approval-ticket-issuance.md) | Atomic paid-order approval with reviewer/time and exact issuance. |
| AC-09 | [TASK-010](TASK-010-admin-review-rejection.md) | Rejection, released reservation and truthful customer notification. |
| AC-10 | [TASK-006](TASK-006-private-artifact-foundation.md), [TASK-011](TASK-011-atomic-approval-ticket-issuance.md), [TASK-014](TASK-014-event-scanning-audit.md) | 006: hash/artifact representation; 011: distinct CSPRNG credentials/original QRs; 014: ticket-number scan denial. |
| AC-11 | [TASK-012](TASK-012-ticket-email-resend.md) | Every ticket and required event/order content in delivered email. |
| AC-12 | [TASK-013](TASK-013-guest-ticket-view.md) | Login-free scoped ticket view with current statuses. |
| AC-13 | [TASK-014](TASK-014-event-scanning-audit.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 014: server staff/event authorization; 015: selected-event UI and denied feedback. |
| AC-14 | [TASK-014](TASK-014-event-scanning-audit.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 014: unchanged rejected state/audit; 015: clear invalid feedback. |
| AC-15 | [TASK-014](TASK-014-event-scanning-audit.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 014: atomic OUTSIDE→INSIDE and safe result; 015: VALID ticket/event/status feedback. |
| AC-16 | [TASK-014](TASK-014-event-scanning-audit.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 014: duplicate/concurrent-entry prevention; 015: ALREADY CHECKED IN feedback. |
| AC-17 | [TASK-014](TASK-014-event-scanning-audit.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 014: exit/re-entry and invalid exit; 015: action mode and displayed results. |
| AC-18 | [TASK-006](TASK-006-private-artifact-foundation.md), [TASK-014](TASK-014-event-scanning-audit.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 006: nullable selected-event audit schema; 014: every domain attempt and transactional rollback; 015: persisted recent-audit presentation. |
| AC-19 | [TASK-007](TASK-007-published-event-catalog.md), [TASK-008](TASK-008-guest-reservation-checkout.md), [TASK-009](TASK-009-payment-slip-submission.md), [TASK-010](TASK-010-admin-review-rejection.md), [TASK-011](TASK-011-atomic-approval-ticket-issuance.md), [TASK-012](TASK-012-ticket-email-resend.md), [TASK-013](TASK-013-guest-ticket-view.md), [TASK-015](TASK-015-mobile-scanner-feedback.md) | 007: catalog/detail hierarchy; 008: buyer/checkout; 009: slip; 010: desktop/mobile review; 011: approval failure; 012: delivery/resend; 013: individual QRs; 015: scanner. Each owns its D-01–D-08/accessibility portion. |
| AC-20 | [TASK-006](TASK-006-private-artifact-foundation.md), [TASK-008](TASK-008-guest-reservation-checkout.md), [TASK-009](TASK-009-payment-slip-submission.md), [TASK-010](TASK-010-admin-review-rejection.md), [TASK-011](TASK-011-atomic-approval-ticket-issuance.md), [TASK-012](TASK-012-ticket-email-resend.md), [TASK-013](TASK-013-guest-ticket-view.md), [TASK-014](TASK-014-event-scanning-audit.md) | 006: hash/private-storage foundation; 008: checkout scope/privacy; 009: protected slip upload; 010: authorized slip read; 011: distinct view capability/original preparation; 012: original private resend; 013: scoped original redisplay; 014: scan secret/data privacy. |
| AC-21 | [TASK-006](TASK-006-private-artifact-foundation.md), [TASK-011](TASK-011-atomic-approval-ticket-issuance.md) | 006: private preparation/delete boundary; 011: atomic failure/retry/concurrency/cardinality and committed-artifact-safe cleanup. |
| AC-22 | [TASK-006](TASK-006-private-artifact-foundation.md), [TASK-011](TASK-011-atomic-approval-ticket-issuance.md), [TASK-012](TASK-012-ticket-email-resend.md) | 006: delivery representation; 011: private retained payload/PENDING at paid commit; 012: initial send, durable failure/recovery/manual same-ticket resend. |
| AC-23 | [TASK-015](TASK-015-mobile-scanner-feedback.md) | Real camera state, below-camera result, capture pause and acknowledgment without resubmission. |

Coverage: 23/23 source criteria planned; zero omitted or invented. No criterion is asserted implemented by this decomposition. API spelling, request/response/error/privacy contracts remain owned by the source spec. UI evidence is supporting, with product/design rules authoritative through that spec and its linked requirement/ADRs.

## Dependency order and available work

One valid topological order for remaining work is TASK-006, TASK-007, TASK-003, TASK-004, TASK-005, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014, TASK-015 (TASK-001/TASK-002 are already done). A task starts only after its actual direct prerequisites are reviewed/done.

- First recommended SPEC-002 task: [TASK-006](TASK-006-private-artifact-foundation.md), since TASK-001 is done. [TASK-007](TASK-007-published-event-catalog.md) can also start independently against persisted event fixtures.
- TASK-006 and TASK-007 can run independently; existing TASK-003 and TASK-004 also have their completed TASK-002 prerequisite. TASK-005 follows TASK-003/TASK-004 and provides the staff browser journey required by TASK-010/TASK-015.
- Guest chain: TASK-006 + TASK-007 → TASK-008 → TASK-009. Staff review chain: TASK-009 + TASK-005 → TASK-010 → TASK-011.
- After TASK-011, TASK-012 (delivery), TASK-013 (ticket view) and TASK-014 (scan service; also TASK-004) can progress independently. TASK-013 uses the prepared link fixture without waiting for live email. TASK-015 follows TASK-014 + TASK-005.

No unresolved product decision blocks planning or the first task. Live PostgreSQL/R2/email/camera checks require the corresponding configured environment; implementation records unavailable external verification honestly rather than claiming it passed. No production credentials are assumed present. Verification policy remains unit-test auto, integration-test off, e2e-test off and code-review required; current package has no test runner script. Each task plans concrete observable checks and the supported typecheck/lint/build commands.

Next workflow: `$implement-task TASK-006`. Implementation requires the explicit user confirmation in AGENTS.md; this planning run authorizes task documents only.

