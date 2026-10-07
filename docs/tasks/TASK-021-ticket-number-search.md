# TASK-021: Ticket Number Search

- Status: done
- Spec: [docs/specs/SPEC-004-ticket-lookup-download.md](../specs/SPEC-004-ticket-lookup-download.md)

## Goal

Customers can look up their ticket status by entering a ticket number (e.g. `TK-abc123-01`) on the existing `/my-tickets` page, in addition to the existing email search. The result shows order, event, and ticket status information but never exposes QR codes, view_tokens, or checkout_tokens.

Read:
- [docs/specs/SPEC-004-ticket-lookup-download.md](../specs/SPEC-004-ticket-lookup-download.md)
- [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md) — view_token security boundary

Relevant existing code:
- `/api/tickets/lookup` route (currently accepts `?email=` only)
- `/my-tickets` page (currently has email-only search form)

## Blocked by

- None

## Todo

- [x] Extend `/api/tickets/lookup` to accept `?ticketNumber=<number>` as an alternative to `?email=<email>`. When ticket number is provided, look up the ticket by exact match (case-insensitive), return the associated order/event/ticket status. Ensure the response does NOT include `qrDataUrl`, `viewTokenHash`, `checkoutTokenHash`, or any secret (AC-01, AC-08).
- [x] Return 404 with a generic "ไม่พบบัตรที่ตรงกับเลขที่นี้" message when the ticket number is not found, without leaking format or existence information (AC-02).
- [x] Return 400 if neither `email` nor `ticketNumber` is provided.
- [x] Verify that existing `?email=` lookup behavior is completely unchanged — same input produces same output (AC-03, AC-09 regression).
- [x] Update the `/my-tickets` page UI to add a search mode toggle (e.g. tabs: "ค้นหาด้วยอีเมล" / "ค้นหาด้วยเลขบัตร"). Ticket-number search results render a single-order card in the same visual style as email results (AC-01).
- [x] Ensure ticket-number search results do not show QR codes or download buttons (AC-08).
- [x] Verify AC-01, AC-02, AC-03, AC-08, AC-09 via unit tests on the lookup API and manual UI verification.
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
- [x] Review approved — TASK-021 working tree against HEAD; AC-01 verified (status info returned without QR/secret exposure), AC-02 verified (404 with generic "ไม่พบบัตรที่ตรงกับเลขที่นี้"), AC-03 and AC-09 verified (email search unchanged without regression), AC-08 verified (no secret tokens or QR URLs leaked, no download button on /my-tickets); typecheck, lint, and build passed; Cache-Control headers confirmed.
