# TASK-011: Admin approval atomically issues exactly the purchased original QR tickets

- Status: done
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the paid-order issuance boundary and approval UI with retry-safe failure handling. Read the owning spec's Approval, artifacts and delivery failure boundary, [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md), [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), and [CONTEXT.md](../../CONTEXT.md). Reuse TASK-010 review/session UI and TASK-006 private artifacts. Accepted [admin-v2](../assets/prototype/admin-verifications.html) shows issuance failure/retry.

## Blocked by

- [TASK-010](TASK-010-admin-review-rejection.md)

## Todo

- [x] Own AC-08 and AC-21 fully; partial AC-10 (CSPRNG/unique QR/hash; ticket-number scan denial completed by TASK-014), AC-19 (approval/retry states), AC-20 (distinct view capability/original private artifacts) and AC-22 (PAID plus durable PENDING delivery prerequisite). TASK-012 completes delivery/manual resend; see [the coverage map](SPEC-002-task-map.md).
- [x] Prepare exactly quantity distinct CSPRNG 32-byte hex admission credentials and original QR images with the agreed qrcode library, plus a distinct 32-byte view capability and sensitive private delivery payload containing the original view link/artifact references. Store objects under unique private R2 keys before the commit; preparation exposes no paid ticket set.
- [x] Implement authorized same-origin/CSRF-protected POST /api/admin/verifications/[id]/approve. In one serialized order transaction recheck WAITING_FOR_VERIFY, commit APPROVED reviewer/time, PAID order, exactly quantity Ticket rows with unique numbers/QR hashes/artifact keys, view hash and delivery-payload reference/PENDING state. Invoke a separate ticket service inside the atomic paid-order boundary; do not independently commit PAID before issuance.
- [x] On QR/R2/preparation/DB failure return ISSUANCE_FAILED and preserve waiting/pending payment/zero partial tickets. A repeated/concurrent PAID approval returns existing count and delivery state without new tickets or email resend. Best-effort clean only losing/unreferenced prepared objects, preserving committed objects even if cleanup fails.
- [x] Connect Approve to real persisted results: retry visible issuance failure; ambiguous response reloads authoritative status. Display PENDING delivery as unconfirmed, never sent. Expose the post-commit delivery boundary for TASK-012 without adding a scheduler or changing scanner logic.
- [x] Verify multi-ticket decoded QR payloads are distinct 32-byte secrets with matching DB hashes and no raw admission/view secret in DB/logs; inspect original private artifacts, distinct checkout/view hashes, reviewer/time and issuance cardinality. Inject QR generation, R2 preparation and DB transaction failures, then retry and race Approve/Reject/Approve requests; inspect no partial PAID set or duplicate tickets and cleanup retaining committed artifacts.
- [x] Observe Admin approval/retry/pending-delivery feedback on mobile/desktop. Record that initial provider delivery and manual resend are TASK-012 work, rather than claiming PENDING satisfies delivered-email criteria.
- [x] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [x] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [x] Review approved — working tree against HEAD; AC-08 and AC-21 fully verified, partial AC-10, AC-19, AC-20, AC-22 verified; typecheck, lint, and build passed cleanly; no findings.

