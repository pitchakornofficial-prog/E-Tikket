# SPEC-004: Ticket Number Lookup & PDF Download

- Status: ready
- Requirement: [docs/requirement.md — Confirmed Ticket Lookup & Download Decisions](../requirement.md#confirmed-ticket-lookup--download-decisions)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md)
- Related spec: [SPEC-002](SPEC-002-ticket-purchase-and-entry.md)

## Problem and outcome

Customers currently can only look up their ticket status by email address, and have no way to save their tickets offline. Adding ticket-number search gives customers a quick status check when they know their ticket number but not the email used. Adding PDF download lets customers save and print their tickets for reliable offline access at the event venue.

Completing this feature produces:

1. An additional search mode on the existing `/my-tickets` page allowing lookup by ticket number, showing order/event/ticket status without exposing QR codes.
2. Per-ticket and batch PDF download buttons on the existing `/tickets?token=xxx` page, generating printable ticket PDFs containing QR code, event details, and ticket number.

## In scope

- Ticket-number search on the existing `/my-tickets` page alongside the existing email search.
- Ticket-number lookup API extending the existing `/api/tickets/lookup` route.
- Per-ticket PDF download from the `/tickets?token=xxx` page (view_token protected).
- "Download All" PDF combining all tickets from one order into a single multi-page PDF.
- PDF download API endpoint protected by view_token.

## Out of scope

- Showing QR codes in ticket-number search results (explicitly excluded per ADR-0002 security boundary).
- Downloading tickets from the `/my-tickets` page (no view_token available there).
- PDF customization by organizer (branding, colors, layout).
- Emailing the PDF as an attachment (existing email delivery already sends QR images).
- Customer accounts or saved ticket history.

## User flow and behavior

### Ticket number search

1. Customer opens `/my-tickets`.
2. The search form offers two modes: "ค้นหาด้วยอีเมล" (existing) and "ค้นหาด้วยเลขบัตร" (new).
3. Customer enters a ticket number (e.g., `TK-abc123-01`) and submits.
4. The system looks up the ticket by its exact ticket number.
5. If found, the page displays the associated order and event information: event name, date, time, venue, order status, ticket status (OUTSIDE/INSIDE/CANCELLED), buyer name, and ticket number. No QR code is shown.
6. If not found, a clear "not found" message is displayed.
7. The existing email search continues to work unchanged.

### PDF download — individual ticket

1. Customer opens `/tickets?token=xxx` via the email link (existing flow, unchanged).
2. Each ticket card now includes a "ดาวน์โหลด PDF" button.
3. Customer clicks the button. The system generates a PDF containing:
   - TICKETBOX branding header.
   - Event name, date, time, and venue.
   - Ticket number.
   - QR code (large, scannable).
   - Buyer name and order reference.
4. The PDF is downloaded to the customer's device.

### PDF download — all tickets

1. On the same `/tickets?token=xxx` page, a "ดาวน์โหลดทั้งหมด" button appears above the ticket list (visible when order has 2+ tickets).
2. Customer clicks the button. The system generates a single PDF with one page per ticket, each containing the same information as the individual download.
3. The multi-page PDF is downloaded to the customer's device.

## Business rules and constraints

1. **View_token gate preserved:** PDF download is only available on the `/tickets?token=xxx` page. The view_token must be validated before generating or serving any PDF containing QR codes. ([ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), [CONTEXT.md rule 10](../../CONTEXT.md))
2. **Ticket-number search is status-only:** Searching by ticket number shows order/event/ticket status information but never exposes QR codes, view_tokens, or checkout_tokens. This is a convenience lookup, not an access grant.
3. **Exact match:** Ticket-number search requires an exact match (case-insensitive). Partial matches are not supported for the MVP.
4. **PDF content security:** The generated PDF contains the QR code image. It must only be generated for authenticated view_token requests on PAID orders. The same access rules as the existing `/api/tickets/view` apply.
5. **Existing email search unchanged:** The current email-based lookup behavior remains identical. The ticket-number search is an additive alternative.

## Data and permissions

### Domain data

No new entities are required. This feature uses the existing `Ticket`, `Order`, and `Event` models.

### Permissions

| Action | Requires |
| --- | --- |
| Search by ticket number | Public (no auth) — status info only, no QR |
| Search by email | Public (no auth) — existing behavior unchanged |
| Download ticket PDF | Valid view_token for a PAID order |
| Download all tickets PDF | Valid view_token for a PAID order |

## Errors and edge cases

1. **Ticket number not found:** Return a clear message: "ไม่พบบัตรที่ตรงกับเลขที่นี้". No information leakage about whether the number format is valid.
2. **Invalid view_token on PDF download:** Return 404 (same as existing `/api/tickets/view` behavior). Do not generate any PDF.
3. **Order not PAID:** PDF download is not available. The download buttons should not appear for non-PAID orders (they are already filtered by the existing view endpoint).
4. **QR artifact unavailable:** If R2 returns an error when fetching QR images for PDF generation, return a 503 with a retry message (consistent with existing ticket view behavior).
5. **Empty ticket number input:** Client-side validation prevents empty submission. API returns 400 if no ticket number is provided.
6. **Cancelled ticket in PDF:** If a ticket within a PAID order has status CANCELLED, the PDF still generates but clearly marks the ticket as cancelled.

## Interfaces and observable test points

### API routes

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/tickets/lookup` | GET | Extended: accepts `?ticketNumber=<number>` in addition to existing `?email=<email>`. Returns order/event/ticket status. When searching by ticket number, returns the single matching order. No QR data in response. |
| `/api/tickets/download` | GET | New: accepts `?token=<view_token>&ticket=<ticketNumber>` for individual download or `?token=<view_token>` for all tickets. Validates view_token, fetches QR artifacts, generates PDF, returns `application/pdf`. |

### UI changes

| Page | Change |
| --- | --- |
| `/my-tickets` | Add a toggle or tab to switch between email search and ticket-number search. Ticket-number search results show a single-order card with the same visual style as email results. |
| `/tickets?token=xxx` | Add "ดาวน์โหลด PDF" button per ticket card. Add "ดาวน์โหลดทั้งหมด" button above the ticket list (when 2+ tickets). |

### UI states

- **Ticket-number search:** Input field for ticket number, search button, loading state, result (single order card or not-found message).
- **Download buttons:** Default state, loading/generating state (spinner), error state (toast or inline message on failure).

## Non-functional requirements

### Security

- PDF generation endpoint must validate view_token with the same logic as the existing `/api/tickets/view` route.
- Generated PDFs must not be cached by CDN or shared caches (`Cache-Control: private, no-store`).
- The ticket-number lookup response must not contain QR data, view_token, checkout_token, or any secret.

### Performance

- PDF generation should complete within a reasonable time. For orders with many tickets (e.g., 10), server-side generation should still respond within a few seconds.
- Client-side PDF generation is acceptable if it avoids adding a heavy server dependency (e.g., Puppeteer). Library choice is non-blocking.

### Accessibility

- Download buttons must be keyboard accessible and have descriptive labels (e.g., "ดาวน์โหลด PDF บัตรใบที่ 1").
- The search mode toggle must be keyboard navigable.

## Acceptance criteria

- AC-01: Given a customer on `/my-tickets`, when they switch to ticket-number search mode and enter a valid ticket number, then the page displays the matching order's event name, date, venue, order status, ticket status, and buyer name without any QR code.
- AC-02: Given a customer on `/my-tickets`, when they search by a ticket number that does not exist, then a "not found" message is displayed without leaking format or existence information.
- AC-03: Given a customer on `/my-tickets`, when they switch back to email search mode, then the existing email search works identically to its current behavior.
- AC-04: Given a customer on `/tickets?token=xxx` with a valid view_token for a PAID order, when they click "ดาวน์โหลด PDF" on a specific ticket, then a PDF is downloaded containing the TICKETBOX branding, event details, ticket number, QR code, and buyer name.
- AC-05: Given a customer on `/tickets?token=xxx` with a PAID order containing 2+ tickets, when they click "ดาวน์โหลดทั้งหมด", then a single multi-page PDF is downloaded with one page per ticket, each containing the same information as individual downloads.
- AC-06: Given a customer on `/tickets?token=xxx` with a PAID order containing exactly 1 ticket, then the "ดาวน์โหลดทั้งหมด" button is either hidden or behaves identically to the individual download.
- AC-07: Given an invalid or missing view_token, when a request is made to the PDF download endpoint, then a 404 response is returned and no PDF is generated.
- AC-08: Given a customer on `/my-tickets` searching by ticket number, when the result is for a PAID order, the result card does not contain a QR code or a download button (view_token is required for those actions).
- AC-09: Given the existing `/api/tickets/lookup` endpoint, when called with `?email=<email>` (existing parameter), then the response is identical to the current behavior with no regression.
- AC-10: Given the existing `/tickets?token=xxx` page, when loaded with a valid token, then all existing ticket display behavior remains unchanged, with the addition of download buttons.
- AC-11: Given a QR artifact that is temporarily unavailable in R2, when a PDF download is attempted, then a clear error message is shown and no corrupted PDF is generated.
- AC-12: Given a PAID order with a CANCELLED ticket, when the full-order PDF is downloaded, then the cancelled ticket's page is included but clearly marked as cancelled.

## Verification plan

| AC | Verification |
| --- | --- |
| AC-01 | Unit test: lookup API with `?ticketNumber=` returns matching order data without QR fields. Manual: verify UI renders status info. |
| AC-02 | Unit test: lookup API with non-existent ticket number returns 404 with generic message. |
| AC-03 | Unit test: lookup API with `?email=` returns same response shape as before (regression check). |
| AC-04 | Unit test: download API with valid token and ticket number returns `application/pdf` with correct headers. Manual: open PDF and verify contents. |
| AC-05 | Unit test: download API with valid token and no ticket number returns multi-page PDF. Manual: verify page count matches ticket count. |
| AC-06 | Manual: verify single-ticket order UI behavior for the "Download All" button. |
| AC-07 | Unit test: download API with invalid/missing token returns 404. |
| AC-08 | Unit test: lookup API response for ticket-number search does not contain `qrDataUrl`, `viewTokenHash`, or `checkoutTokenHash`. |
| AC-09 | Unit test: existing email lookup regression — same input produces same output shape. |
| AC-10 | Manual: verify existing ticket view page renders correctly with download buttons added. |
| AC-11 | Unit test: download API returns 503 when R2 artifact fetch fails. |
| AC-12 | Manual: download PDF for an order with a cancelled ticket and verify the cancelled status is visible on the PDF page. |

## Open questions

- **Non-blocking:** PDF generation library choice (e.g., `@react-pdf/renderer` for client-side, `jsPDF` for lightweight server-side, or `pdf-lib` for low-level control) — to be decided during implementation based on bundle size and rendering needs.
- **Non-blocking:** Exact PDF layout and typography — follows the agreed dark monochrome design direction but the PDF itself will likely use a print-friendly light background for readability. Detail deferred to implementation.
