# TASK-006: Private guest credentials, original ticket artifacts and rejected scan attempts have a durable, private representation

- Status: todo
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Provide the shared persistence/storage boundary required by multiple purchase and scan slices. Read the owning spec's Data, permissions, and interfaces, [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), [CONTEXT.md](../../CONTEXT.md), and [workflow](../workflow.md). Extend the existing Prisma 6 schema/client and Cloudflare R2 boundary; retain TASK-001's migration and seeded staff evidence.

## Blocked by

- [TASK-001](TASK-001-app-database-foundation.md)

## Todo

- [ ] Own prerequisites only: partial AC-10 (hash/artifact representation), AC-18 (nullable audit representation), AC-20 (hash-only capabilities/private objects), AC-21 (preparation cleanup boundary), and AC-22 (durable delivery representation). Endpoint behavior is completed by TASK-008–TASK-014 as mapped in [the coverage map](SPEC-002-task-map.md).
- [ ] Add a subsequent migration for separate unique order checkout/view hashes, original QR artifact references, private delivery-payload reference, PENDING/SENT/FAILED delivery state, last attempt and sanitized error. View access remains absent before issuance. Replace the draft plaintext viewToken representation safely; inspect existing rows and define a safe migration/backfill or explicit data prerequisite without dropping orders or rewriting completed migrations.
- [ ] Extend existing TicketScan with nullable ticket relation, selected event relation, result vocabulary and required event/time and ticket/time indexes. Retain attributable staff/action/time and never persist raw scan credentials. Make duplicate-slip SHA-256 uniqueness enforceable in the database; inspect legacy duplicates before adding its constraint.
- [ ] Provide server-only CSPRNG 32-byte hex generation/SHA-256 capability helpers and a private R2 put/read/delete boundary using the agreed S3-compatible SDK. Artifact keys are unique references, never public permissions; service callers own authorization. Surface unavailable configuration/storage truthfully and permit failure injection for downstream checks.
- [ ] Document required environment variable names and private bucket configuration with placeholders only; keep secrets in ignored environment files. Do not add product endpoints, new token TTLs, scheduler, queue, or ticket issuance in this prerequisite.
- [ ] Verify migration on a disposable PostgreSQL database and an existing-schema fixture; inspect retained staff/events/orders, uniqueness failures, distinct hash-only capabilities, nullable unknown scans and known wrong-event association. Verify private artifact byte round-trip, direct unauthenticated access denial, read/write failure and deletion of only task-owned unreferenced objects; record any unavailable live R2 check as a real verification blocker.
- [ ] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [ ] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

