# TASK-022: PDF Ticket Download

- Status: todo
- Spec: [docs/specs/SPEC-004-ticket-lookup-download.md](../specs/SPEC-004-ticket-lookup-download.md)

## Goal

Customers can download their tickets as PDF from the existing `/tickets?token=xxx` page — either individually per ticket or as a single multi-page PDF for the entire order. The download is protected by the existing view_token gate.

Read:
- [docs/specs/SPEC-004-ticket-lookup-download.md](../specs/SPEC-004-ticket-lookup-download.md)
- [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md) — view_token security boundary

Relevant existing code:
- `/api/tickets/view` route (view_token validation and QR artifact fetching)
- `/tickets` page (ticket card display with QR codes)

## Blocked by

- None

## Todo

- [ ] Implement `/api/tickets/download` GET endpoint. Accept `?token=<view_token>` (required) and optional `?ticket=<ticketNumber>` for individual download. Validate view_token using the same logic as `/api/tickets/view`. Fetch QR artifacts from R2 (AC-04, AC-05).
- [ ] Generate PDF server-side or client-side (choose library during implementation, e.g. `jsPDF`, `@react-pdf/renderer`, or `pdf-lib`). Each ticket page contains: TICKETBOX branding, event name/date/time/venue, ticket number, large QR code, buyer name and order reference (AC-04).
- [ ] When `?ticket=<ticketNumber>` is provided, generate a single-page PDF for that specific ticket. When omitted, generate a multi-page PDF with one page per ticket in the order (AC-05).
- [ ] Return 404 for invalid/missing view_token — no PDF generated (AC-07). Return 503 if R2 artifact fetch fails (AC-11). Set `Cache-Control: private, no-store` on PDF responses.
- [ ] Handle cancelled tickets in the PDF: include the page but clearly mark the ticket as cancelled (AC-12).
- [ ] Add "ดาวน์โหลด PDF" button to each ticket card on the `/tickets?token=xxx` page (AC-04, AC-10).
- [ ] Add "ดาวน์โหลดทั้งหมด" button above the ticket list when the order has 2+ tickets. For single-ticket orders, hide this button or make it behave identically to the individual download (AC-05, AC-06).
- [ ] Include loading/generating state on buttons (spinner) and error feedback on failure (AC-11).
- [ ] Ensure all existing ticket view page behavior remains unchanged apart from the added download buttons (AC-10).
- [ ] Verify AC-04, AC-05, AC-06, AC-07, AC-10, AC-11, AC-12 via unit tests on the download API and manual PDF inspection.
- [ ] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
