# ADR 0002: Private Ticket Artifacts, Separate Guest Access, and Complete Scan Audit

## Status

Accepted

## Date

2026-10-06 (Asia/Bangkok)

## Context

[SPEC-002](../specs/SPEC-002-ticket-purchase-and-entry.md) exposed three architectural gaps while reconciling six prototype journeys with the MVP requirements: redisplaying admission QRs when the database stores only hashes, accessing private guest payment/order data before the ticket email, and recording rejected or unknown-ticket scans with a schema that currently requires a ticket ID.

The user explicitly selected S1=A, S2=A, and S3=A in `$grill-workflow`. The selection record and related slip/delivery business decisions are authoritative in [Confirmed Purchase and Entry Decisions](../requirement.md#confirmed-purchase-and-entry-decisions). Existing [ADR-0001](0001-core-architecture-and-tech-stack.md) remains active: Next.js modular monolith, PostgreSQL/Prisma, Cloudflare R2, no customer accounts, SHA-256 admission-token hashes, and a decoupled paid-order issuance boundary.

## Decisions

### S1: Preserve the original QR image in private R2 storage

- Generate each admission credential with the agreed CSPRNG 32-byte secret and render its QR image.
- Store the original QR image as a private R2 artifact. An image encodes the admission secret and is sensitive even though the database does not contain the raw token.
- Store only the QR token's SHA-256 hash and the artifact location in the database; do not store plaintext or encrypted admission tokens there as a substitute for this decision.
- The application validates the ticket-view capability before returning the image. An object key or readable ticket/order number is not itself access authorization, and the artifact must not be exposed through a public bucket URL.
- Redisplay and email resend use the same original QR artifact; do not rotate/regenerate ticket credentials merely because a page is reloaded or an email is retried.

### S2: Extend TicketScan to represent every attempt

- Retain one TicketScan table for successful and rejected attempts rather than introducing a separate ScanAttempt table.
- Permit the ticket association to be absent when the credential does not resolve to a real ticket. Record the selected event, staff, action, timestamp, and result for the attempt.
- Distinguish the event the staff member is scanning for from any known ticket's actual event; wrong-event attempts must remain attributable without granting entry.
- Record successful entry/exit, duplicate entry, invalid action, cancellation, wrong-event, unpaid-order, and unknown-ticket results. Rejected attempts do not change the ticket's entry state.
- Do not place raw admission secrets in audit data. Exact result identifiers, schema fields/indexes, and migration details belong to the owning spec and implementation planning.

### S3: Separate checkout access from ticket viewing

- Give the guest a checkout capability for the payment page, private order status, and eligible slip submission associated with their order.
- Keep this capability separate from the `view_token` used to open admission tickets through the emailed link. Possession of the checkout capability does not grant access to admission QRs.
- A readable order ID is insufficient authorization. These guest capabilities are separate from the staff cookie/session engine and do not create customer accounts.
- Upload permission still depends on the authoritative order state and reservation expiry. The capability cannot extend the 15-minute inventory lock.
- Exact issuance/return mechanics, token lifecycle, request representation, and API/error contracts must be specified within these boundaries; they are not implicitly selected by a prototype link or this decision record.

## Consequences

- Original ticket QRs can be displayed again without reconstructing a secret from its hash or changing the database hash-only guarantee.
- The private artifact store becomes necessary for ticket redisplay and email resend; retrieval failures must be surfaced truthfully. Artifact preparation/cleanup and database transaction boundaries need explicit specification because R2 writes are not part of a PostgreSQL transaction.
- Future task planning must include focused schema migrations for the artifact reference, separate guest capability, and extended audit representation. Preserve prior migrations and completed task evidence; do not silently reopen or overwrite delivered work.
- The Admin retry behavior for approval/issuance and manual email resend is already agreed as R1=A and R2=A in the requirement record. This ADR does not choose a queue, scheduler, new service, storage retention policy, or exact retry algorithm.
- SPEC-002 remains draft until its owner incorporates the decisions, completes interface/failure semantics, and reconciles the pending design review. This record contains decisions, not implementation evidence.
