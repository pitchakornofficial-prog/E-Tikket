# SPEC-002: Ticket Purchase, Payment Verification & Event Entry

- Status: ready
- Requirement: [docs/requirement.md](../requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md), [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md)
- Related spec: [SPEC-001: Database & Authentication](SPEC-001-database-and-auth.md)
- Technical reference: [docs/technical-spec.md](../technical-spec.md) — Draft / Proposed; examples are not independent approval of additional behavior.
- Workflow: [docs/workflow.md](../workflow.md)
- Prototype acceptance: 2026-10-06 (Asia/Bangkok); user explicitly answered “ยอมรับทั้ง 6 หน้า v2” for home-v2, event-v2, checkout-v2, tickets-v2, admin-v2 and scanner-v2.
- Reconciled: 2026-10-06; S1–S3, F1, R1–R2, ADR-0002 and D-01–D-08 incorporated. Acceptance is limited to these scoped UI journeys; simulation tools and excluded proposals remain non-authoritative.

## Problem and outcome

Guests need to find an event, reserve tickets for 15 minutes, submit bank-transfer evidence, and receive individual secure tickets after Admin approval. Organizers need a mobile workflow to validate entry and temporary exit without allowing duplicate entry or tickets from another event.

This specification reconciles the six existing prototype pages with the authoritative requirements. It describes the purchase-to-entry journey across the relevant MVP phases. Database and staff authentication remain owned by SPEC-001; its ACs and existing tasks are unchanged. The product/security decisions below resolve the earlier drafting gaps. The user explicitly accepted all six v2 revisions; the quality gate is complete and the contract is ready for decomposition.

## In scope

- Public event catalog and event details for published events.
- Guest quantity selection, buyer name/email/phone, order summary, server-calculated amount and platform fee, and 15-minute inventory reservation.
- Bank-transfer payment instructions, slip selection/upload, validation, duplicate-slip prevention, and waiting/expired states.
- Admin review of pending orders and their slips, approval or rejection, and the resulting order/payment states.
- Ticket issuance after PAID, one secure QR per purchased ticket, email delivery, and token-protected View My Tickets.
- Organizer mobile QR scanning, event scoping, CHECK_IN/CHECK_OUT, re-entry, rejection feedback, and scan audit records.
- Responsive information hierarchy, accessible controls, and explicit loading/error/empty states needed to observe these flows.

## Out of scope and ownership boundaries

- Staff login/session implementation, owned by SPEC-001. The six prototypes contain no login page and do not replace its AC-08 or TASK-005.
- Organizer Event CRUD/publishing interfaces, full Admin/Organizer dashboards, KPI/report calculations, Users/Settings screens, and general orders/history management. Their existence in requirements or decorative navigation does not make their implementation part of these prototype journeys.
- Customer accounts, seat selection/maps/zones, queues, Redis, microservices, and automated payment gateways remain outside the MVP.
- Prototype-only simulation buttons, prototype navigation bars, fake camera/QR graphics, and direct demo transitions between guest and privileged staff pages.
- Unaccepted proposals including scheduled public previews of unreleased events, a ten-ticket purchase cap, exact menu structure, and mandatory rejection reasons.

## Prototype references

Evidence: current workspace revisions inspected 2026-10-06 (Asia/Bangkok), following `$edit-prototype`. These files are editable visual evidence, not a released implementation. The user explicitly accepted all six v2 revisions in response to the acceptance question (“ยอมรับทั้ง 6 หน้า v2”) on 2026-10-06. This acceptance follows review delivery, rather than being inferred from prototype existence. The agreed design constraints already have authority through [D-01–D-08](../requirement.md#ui-design-requirements).

| Revision | Page | Evidence considered |
| --- | --- | --- |
| `home-v2` | [index.html](../assets/prototype/index.html) | Original-color sample artwork, prominent event names, date/venue/price/purchase hierarchy, selected event navigation. |
| `event-v2` | [event-detail.html](../assets/prototype/event-detail.html) | Event details, positive quantity, buyer fields, summary, validated submission before checkout. |
| `checkout-v2` | [checkout.html](../assets/prototype/checkout.html) | Distinct checkout access, countdown, JPEG/PNG selection, upload errors, waiting/expired/paid/rejected states. |
| `tickets-v2` | [tickets.html](../assets/prototype/tickets.html) | Email-link context, individual large QRs, ticket numbers/current statuses, no tickets before approval. |
| `admin-v2` | [admin-verifications.html](../assets/prototype/admin-verifications.html) | Order/slip comparison, Approve/Reject, issuance failure/retry, persisted delivery failure/manual resend. |
| `scanner-v2` | [organizer-checkin.html](../assets/prototype/organizer-checkin.html) | Selected event/action, results below camera, acknowledgment, re-entry and rejected-attempt audit. |

Shared [script.js](../assets/prototype/script.js) and [style.css](../assets/prototype/style.css) support all six. The prior v1 baseline is superseded as current visual evidence; old AC identifiers are preserved.


### Evidence snapshot

SHA-256 fingerprints of the reviewed workspace files at reconciliation time (revision IDs remain the primary references):

| File | SHA-256 |
| --- | --- |
| `index.html` | `fb1e56f819091b5871ce6bb350c025b8d30fd4abab9ee1f7a542fb4647a2019a` |
| `event-detail.html` | `61b216a1161d50fb36dd6fe7a548e1d26a65b07c5a6812f6f7275e90726c1715` |
| `checkout.html` | `55d2f033d7b4a2af49a8fe6c5e0666f0e960a7b3a7cf7d3ff884e4f9faab6ea5` |
| `tickets.html` | `000612c4e3d91cb113501138c8c214de0618360f14938a02f897335023329b3e` |
| `admin-verifications.html` | `2d3b712758f7af1077cd0ac07cfe61fd8ef615251a81344e4c296c255999812b` |
| `organizer-checkin.html` | `d4773a7823fd9e5743717c95714f42a9b61c499e5c8ed8b5bbb7e66822fc627d` |
| `script.js` | `000798dd0ed4f35a63b940604c79a92a661f20a5fe58f30f7434276f70799872` |
| `style.css` | `ad8883282938b69b80e88ca0071202b2fc47bfa3dad48b9fc1982532d7202004` |
| `poster-summer.svg` | `98c0ef9769f5a3c7c95faf5f8fd38c8139b3e9f6ff9774544c5104f108c49a6e` |
| `poster-indie.svg` | `92594b9c6d420289813cfda0bb67717b6750b75e47c17a531bb30cd476ae79b7` |

## Prototype reconciliation

| Evidence | Classification | Contract treatment |
| --- | --- | --- |
| Event identity, guest fields, quantity/summary, server-owned reservation | Requirement-backed | Preserve selected event; validate and create before navigating; browser sessionStorage is only a demo mechanism. |
| Upload → WAITING_FOR_VERIFY; expiry only for PENDING_PAYMENT | Requirement-backed | Server expiry/status gates upload. Reload cannot restart the reservation. |
| JPEG/PNG, 5 MB | Requirement-backed, F1 | Validate actual bytes server-side, not only MIME/name/accept attributes. |
| Private original QR artifacts, separate checkout/view capabilities | Requirement-backed, S1/S3 and ADR-0002 | Hash-only QR database storage, protected redisplay/resend; neither readable IDs nor checkout capability grant ticket access. |
| Issuance failure keeps waiting; email failure keeps PAID and allows resend | Requirement-backed, R1/R2 | Truthful persisted outcomes and idempotent issuance as specified below. |
| Event-scoped entry/exit, duplicate/invalid feedback, all-attempt audit | Requirement-backed, S2 | Server checks and TicketScan representation below; fake demo ticket keys are not credentials. |
| Dark TICKETBOX UI; event-led hierarchy; original artwork colors; limited semantic accents with text/icons | Requirement-backed, D-01–D-05/D-08 | Preserve stable design constraints and verify through AC-19; exact color codes/fonts are not required. |
| Desktop order alongside slip; mobile order → slip → decisions | Requirement-backed, D-06 | Preserve concurrent desktop comparison and mobile reading/action order. |
| Large result below camera; “สแกนคนถัดไป” acknowledgment | Requirement-backed, D-07 | Pause further scan submissions until result acknowledgment; no overlay covering the camera. |
| Slip preview, featured-card proportions, exact borders/spacing, sample SVG art | Visual-only / non-mandatory UI detail | May adapt for real assets, accessibility and framework conventions. No new business rule. |
| Prototype bar, reset/expiry/scenario controls, public staff demo links, fake camera/QR, sessionStorage persistence | Simulation-only, excluded | Not production routes, authorization, payment, inventory, email or camera behavior. |
| v1 coming-soon event, arbitrary purchase cap, fee disclosure, mandatory Reject reason/history menus | Excluded proposals | Not carried into the contract; configurable internal fee calculation remains required. |
| v1 modal, skipped validation, restart-on-load timer, success-only logging | Superseded evidence | v2 presents the agreed UI corrections; production verification still tests server-owned behavior. |

No new product proposal is adopted. Prototype-confirmed evidence: the user accepted these six v2 renderings and interaction representations; requirement-backed product/design rules remain authoritative. Technical integration choices below operationalize those constraints within this specification and do not assert production implementation evidence.

## User flows and authoritative behavior

### Catalog and guest order

1. A guest opens the catalog and chooses a published event. Event identity must survive navigation; different cards cannot all purchase the same sample event.
2. Event details expose the image, name, description, date, start time, venue, price, and ticket quantity/availability relevant to purchase. TICKETBOX is the agreed display brand (D-08); sample event names, dates, door/end times and event copy are fixtures, not fixed values or new data requirements.
3. The guest chooses a positive ticket quantity and supplies name, email, and phone without registration. The server validates input, sale eligibility, and available inventory.
4. On successful creation, the order is PENDING_PAYMENT, reserves the purchased quantity for 15 minutes, and records its server-calculated total, configured fee percentage, fee amount, organizer revenue, and expiry.
5. Only after creation succeeds does the customer reach payment information for that order. Invalid input or unavailable inventory must not create a successful reservation or payable confirmation.

### Payment and expiry

1. The order's payment view shows its identity, buyer/order summary, actual amount, and configured transfer instructions/bank account or transfer QR.
2. The reservation countdown reflects the server's expiry and cannot be extended by refreshing. A transfer QR is distinct from the later admission QR.
3. The customer selects and uploads a slip within the reservation window. The server decodes/validates JPEG or PNG bytes with size at most 5,242,880 bytes (the v2 5 MB convention), and checks its SHA-256 slip hash for duplicates; a client-side preview is not proof of payment or successful upload.
4. An accepted upload records payment evidence and changes the order to WAITING_FOR_VERIFY. No PAID status or issued admission tickets follow from uploading alone.
5. A PENDING_PAYMENT order with no timely slip becomes EXPIRED and returns reserved inventory. An expired order cannot be advanced by an old browser upload action.
6. The pending-payment timer must not falsely announce released inventory for an order already WAITING_FOR_VERIFY. The authoritative status determines the available actions.

### Admin review and issuance boundary

1. An authenticated ADMIN views pending verification orders, buyer details, event, quantity, amount, and the actual slip. Organizer/guest access cannot authorize review decisions.
2. Approve prepares private QR artifacts, then records reviewer/time, APPROVED payment, PAID order and exactly the purchased tickets through one atomic database commit. Payment orchestration calls the separate ticket-issuance service at the PAID boundary; no independent partial PAID commit precedes failed issuance. See the failure boundary below (R1 and ADR-0001/0002).
3. A paid order receives exactly its purchased quantity of tickets, with unique ticket numbers and distinct cryptographically random 32-byte QR secrets. The database stores SHA-256 QR hashes rather than readable scan secrets; each ticket also stores a private R2 artifact reference; the original QR is returned only after ticket-view capability validation (ADR-0002).
4. Reject changes the order to REJECTED and notifies the customer that verification failed. It does not issue tickets. Required reason collection or resubmission/re-reservation rules are not inferred from prototype prompts or draft technical state diagrams.
5. UI success must reflect the real server outcome. A payment approval message must not claim email delivery succeeded merely because the payment was approved; issuance failure leaves WAITING_FOR_VERIFY with retry available; email failure leaves PAID and existing tickets, with a persisted failed-delivery indicator and manual resend of those same tickets.

### Email and View My Tickets

1. Following approval and issuance, the customer receives an email with the event name, date/time, venue, ticket numbers, individual QR codes, quantity, and order information for all purchased tickets.
2. The email-delivered secure `view_token`, distinct from the checkout token, grants access to that order's tickets without customer login. Missing/invalid tokens must not reveal another buyer's order, profile, or QR codes.
3. The ticket view displays each individual ticket and prominent readable/scannable QR, using the current authoritative ticket status. The prototype's all-OUTSIDE sample does not override real INSIDE or CANCELLED states.
4. Ticket-number labels are human references; they cannot substitute for QR secrets. No production SECRET TOKEN #1 labels or simulation links are required.

### Check-in, temporary exit, and re-entry

1. An authenticated Organizer operates within an event they are permitted to manage. The current event and CHECK_IN/CHECK_OUT action must be clear before a scan is submitted.
2. The server hashes the scanned secret, locates the ticket, and checks event identity, PAID order status, cancellation, staff permissions, and the current ticket state.
3. CHECK_IN changes OUTSIDE to INSIDE and shows VALID TICKET, ticket number, event, and the checked-in status. CHECK_IN on an INSIDE ticket shows ALREADY CHECKED IN and leaves it unchanged.
4. CHECK_OUT changes INSIDE to OUTSIDE. A later CHECK_IN returns it to INSIDE, allowing re-entry. Checkout of an already OUTSIDE ticket cannot fabricate a successful state change.
5. Unknown, wrong-event, unpaid, or cancelled tickets are rejected and do not grant entry or change state. Scan decisions and updates remain server-owned.
6. Every scan is auditable with time, action, staff, and result, associating the ticket where known. TicketScan has a nullable ticket association, selected event, staff/action/time/result; unknown credentials have no ticket association and no raw credential in audit data.
7. Feedback clearly distinguishes success, duplicate entry, and invalid cases and allows the staff member to continue scanning. Per D-07, the result stays below the camera and blocks new scan submissions until “สแกนคนถัดไป” is activated. This acknowledgment resumes capture; it does not repeat the prior request or alter ticket state. Audit refresh transport is an implementation detail, not a real-time synchronization feature.

## UI states and acceptance mapping

States below describe observable outcomes. The prototype demonstrates only some of them; required server validation/security/expiry states come from the authoritative requirements. Additional loading/empty/error states are necessary operational states even where the simulation does not render them; they do not introduce new product scope.

| View | States | AC mapping |
| --- | --- | --- |
| Catalog | Loading; published-event list; no published events; load failure | AC-01, AC-19 |
| Event/order form | Details loaded; quantity/summary; invalid input; unavailable quantity; creating; created; failure | AC-02, AC-03, AC-04, AC-19 |
| Payment/slip | PENDING_PAYMENT with remaining time; file selected; uploading; invalid/duplicate file; WAITING_FOR_VERIFY; EXPIRED; server failure | AC-05, AC-06, AC-19 |
| Admin verification | Authentication/authorization failure; pending list; empty list; slip view; approving/rejecting; server-confirmed PAID/REJECTED; issuance failure/retry; email pending/sent/failed and resend; action failure | AC-07, AC-08, AC-09, AC-19, AC-21, AC-22 |
| Tickets | Token denied; loading; no issued tickets yet; issued ticket list; OUTSIDE/INSIDE/CANCELLED; retrieval failure | AC-10, AC-11, AC-12, AC-19, AC-20 |
| Scanner | Unauthorized; current event/action ready; camera access failure; submitting; valid entry/exit; duplicate entry; invalid ticket/event/order/action; scan failure; audit list/empty | AC-13–AC-19, AC-23 |

No camera-ready indicator or scan success may be shown as established while access or server validation has failed. The scanner shows camera denial/unavailability and server/audit failure without claiming admission succeeded. Automatic captures pause while submitting or awaiting acknowledgment. A failed request is reported as unknown/unconfirmed until the server state is read; it must not optimistically grant entry. Real-time sync and exact capture-library choice are not contractual.

## Data, permissions, and interfaces

### Ownership, storage and concurrency

- Reuse User/Event/Order/Payment/Ticket/TicketScan and staff authentication from SPEC-001. Add focused subsequent migrations for ADR-0002; preserve completed migrations, tasks and evidence. This document does not edit them.
- Order creation must atomically reserve inventory and persist its price/fee snapshot and `expiresAt`. Count paid quantities plus unexpired PENDING_PAYMENT reservations and WAITING_FOR_VERIFY quantities against event supply. Serialize competing reservation decisions so stock cannot be oversold. Expiry release is idempotent and follows the original expiry; it may be enforced by bounded database maintenance and authoritative reads/writes without Redis or queues. REJECTED orders no longer consume a purchase reservation; cancellation/refund/resubmission workflows are outside this spec.
- Store hashes of separate CSPRNG 32-byte hex checkout and view capabilities, uniquely bound to their order. Generate checkout capability at order creation and return it only on successful creation. Generate the distinct view capability during approval preparation and persist its hash at the successful PAID/ticket commit; deliver it in the ticket email. No arbitrary new token TTL is introduced: checkout reads follow retained order existence, upload remains gated by state/expiry, and ticket viewing follows retained order/ticket eligibility. Rejected/expired/non-PAID orders never reveal admission QRs.
- Use checkout URL `/checkout/<orderId>?token=<checkoutToken>` and ticket URL `/tickets?token=<viewToken>`. API checkout requests use `Authorization: Bearer <checkoutToken>`; ticket-view endpoint uses its existing token query. Do not leak these URLs/tokens in ordinary logs, analytics or referrers: protected responses use `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer`. SessionStorage demo data is not an access mechanism.
- Ticket stores only `qrTokenHash` and private `qrArtifactKey`, never raw/encrypted QR tokens. Private slip/QR keys are not public URLs or permissions. Authorized responses stream/encode private bytes (ticket view may return `qrDataUrl`); public event artwork is a separate asset concern.
- TicketScan adds nullable `ticketId`, required `eventId` (selected event), `result`, existing staff/action/time, and before/after state where needed for review. Known ticket event stays derivable through its relation; do not substitute it for the selected event. Result identifiers: `VALID`, `ALREADY_CHECKED_IN`, `INVALID_ACTION`, `CANCELLED`, `WRONG_EVENT`, `UNPAID`, `INVALID`. `INVALID` includes unknown credentials; store no raw scanned secret. Index selected event/time and ticket/time; event/staff relations remain attributable.
- For authorized well-formed scan submissions, commit the scan audit and any valid state transition in one transaction. Serialize/CAS concurrent ticket transitions, so two CHECK_IN attempts produce one VALID and one ALREADY_CHECKED_IN. If audit persistence fails, rollback the state change and return failure. Unauthorized or malformed requests must be denied before any ticket information/transition; they do not fabricate a TicketScan row attributed to an unauthenticated staff member.

### Approval, artifacts and delivery failure boundary

1. Authorize ADMIN, load WAITING_FOR_VERIFY payment/order and prepare the purchased quantity of CSPRNG credentials/private QR artifacts, the distinct view capability and a private delivery payload containing that view link and the original QR references. Preparation has no externally visible paid tickets. Failure returns `ISSUANCE_FAILED`, leaves payment pending/order WAITING_FOR_VERIFY, and allows retry (R1).
2. Within one serialized order transaction recheck eligible state, mark payment APPROVED with reviewer/time, transition order to PAID, and issue all Ticket rows plus artifact references through the decoupled ticket service; persist the view capability hash, delivery artifact reference and delivery PENDING state in that same commit. Commit all or none. Enforce unique ticket number/hash and order-ticket issuance cardinality; competing/repeated Approve cannot issue extras. The ticket service is usable at the future paid-payment boundary without scanner changes.
3. R2 writes are not in the database transaction. A failed/losing attempt must best-effort delete only its unreferenced prepared objects; it must not delete committed objects or overwrite their keys. Failure leaves no discoverable tickets. Cleanup failure is a diagnostic/orphan-storage concern and does not claim approval succeeded; no new cleanup scheduler is required.
4. Persist ticket-email delivery state `PENDING`, `SENT`, or `FAILED`, last attempt time and sanitized failure information separately from payment. After commit, send all issued tickets and the view link using original artifacts. To recover the same email view link without storing a plaintext view capability in the database, retain the original email payload/view link as the private R2 delivery artifact prepared before the PAID commit and referenced by the order. The retained payload contains original artifact references; regenerated presentation must use the same view capability and QR bytes. This artifact is sensitive and returned only to the delivery service, never as a public object URL.
5. Delivery failure or interruption never rolls back PAID/tickets. PENDING means unconfirmed delivery, not sent; FAILED means observed failure. ADMIN can manually resend a PAID order with pending/failed delivery, using the same tickets, original QRs and view link. Serialize overlapping attempts; retain failure on retry failure. SMTP/provider acceptance is recorded as SENT, not proof of inbox arrival. A timeout may have delivered the same email; exact-once external email is not promised. No scheduler or new queue is introduced (R2).
6. Reject atomically records payment REJECTED, order REJECTED and reviewer/time without issuing tickets. Attempt rejection notification and report notification failure truthfully without restoring the order to waiting or falsely claiming delivery. No mandatory reason field, refund flow or automatic resend policy is added.

### Bounded API contract

These routes complete the draft technical examples for the existing journeys. Route spelling and payload fields are spec-level integration choices, not additional user features. No implementation is asserted. Money fields are decimal strings in THB; timestamps are UTC ISO 8601, rendered in the configured event/display timezone. IDs do not grant authority.

Success bodies use the fields below; failures use `{ error: { code, message, fields? } }`, with optional refreshed `orderStatus`/`expiresAt` for authorized stale-state feedback. Never include credentials or private records in error bodies. Form errors preserve safe entered values. Staff mutations use SPEC-001 sessions and same-origin/CSRF protection.

| Route | Input / authority | Success response | Failure contract |
| --- | --- | --- | --- |
| `GET /api/events` | Public | 200 `{ events: [{ id, name, imageUrl, eventDate, startTime, venue, ticketPrice, availableQuantity }] }`; only PUBLISHED, empty array allowed | 503 `SERVICE_UNAVAILABLE` |
| `GET /api/events/[id]` | Public | 200 `{ event: { ...catalogFields, description, organizerName } }` | 404 `EVENT_NOT_FOUND` for missing/unpublished |
| `POST /api/orders` | `{ eventId, customerName, customerEmail, customerPhone, quantity }`; guest | 201 `{ orderId, checkoutToken, checkoutUrl, orderStatus: "PENDING_PAYMENT", totalAmount, expiresAt }` | 422 `VALIDATION_ERROR` (trimmed nonempty name/phone, valid email, integer quantity ≥1); 404 `EVENT_NOT_FOUND`; 409 `INSUFFICIENT_INVENTORY`; 503 no confirmed success |
| `GET /api/orders/[id]` | Checkout Bearer capability | 200 `{ orderId, event, customer, quantity, totalAmount, orderStatus, expiresAt, bankAccount, transferQr? }` | 404 `ORDER_NOT_FOUND` uniformly for missing/invalid/mismatched capability; no view token, QR or ticket artifacts |
| `POST /api/orders/[id]/slip` | Checkout Bearer; multipart `file`; server time before expiry and PENDING_PAYMENT | 200 `{ success: true, orderStatus: "WAITING_FOR_VERIFY" }`; persist unique SHA-256 slip hash and private R2 reference | 404 capability denial; 422 missing/invalid bytes; 413 `FILE_TOO_LARGE` over 5,242,880 bytes; 415 `UNSUPPORTED_FILE_TYPE`; 409 `DUPLICATE_SLIP`, `ORDER_EXPIRED` or `INVALID_ORDER_STATE`; 503 storage failure leaves no accepted upload |
| `GET /api/admin/verifications` | ADMIN session | 200 `{ orders: [{ id, customer, event, quantity, totalAmount, status, slipPreview, deliveryStatus }] }`; WAITING_FOR_VERIFY plus PAID with PENDING/FAILED delivery for manual resend; empty array allowed | 401 no session; 403 wrong role; 503 unavailable; slip bytes retrieved only after authorization |
| `POST /api/admin/verifications/[id]/approve` | ADMIN; no client payment/amount/staff override | 200 `{ success: true, orderStatus: "PAID", ticketsCreated, deliveryStatus }`; FAILED/PENDING delivery still approval success; repeated PAID request returns existing count/state without issuance/email resend | 401/403; 404 missing order; 409 `INVALID_ORDER_STATE`; 503 `ISSUANCE_FAILED` keeps waiting (pre-commit); on ambiguous response client reloads authoritative status |
| `POST /api/admin/verifications/[id]/reject` | ADMIN; empty body, optional reason not mandatory | 200 `{ success: true, orderStatus: "REJECTED", notificationStatus }`; repeated REJECTED does not repeat notification | 401/403; 404 missing; 409 invalid state; 503 before commit no success |
| `POST /api/admin/verifications/[id]/resend-email` | ADMIN; PAID, delivery pending/failed; no new ticket input | 200 `{ orderStatus: "PAID", deliveryStatus: "SENT", ticketsCreated: 0 }` | 401/403/404; 409 `INVALID_ORDER_STATE` or `DELIVERY_IN_PROGRESS`; 503 `DELIVERY_FAILED` retains tickets/PAID, persists failure |
| `GET /api/tickets/view?token=...` | Email view capability only | 200 `{ order: { id, event, quantity, customerName }, tickets: [{ ticketNumber, status, qrDataUrl }] }`; only PAID issued order | 404 `TICKETS_NOT_FOUND` uniformly for missing/invalid/checkout token or ineligible order; 503 `ARTIFACT_UNAVAILABLE` preserves existing tickets/credentials |
| `POST /api/organizer/checkin` | Session ORGANIZER owning selected event; `{ eventId, qrToken, action }` | 200 `{ result, action, eventId, scannedAt, ticket?: { ticketNumber, status } }`; result identifiers above cover accepted/denied domain attempts. Wrong-event/unpaid/unknown feedback must not expose other buyers or raw tokens | 401 no session; 403 unauthorized selected event; 422 malformed request/action; 503 `SCAN_UNCONFIRMED` when validation/persistence unavailable, never successful admission |

No cross-order tokens, PUBLIC slip URLs, raw QR secrets in list responses, client-supplied audit identity, mandatory rejection reason, unrestricted history queries, customer fee-disclosure line or scheduler are implied. Price/fee values remain authoritative server calculations. Endpoint result vocabulary maps to meaningful UI messages; it need not reuse the prototype's internal demo labels (`PASS`, `ALREADY_INSIDE`).

## Acceptance criteria

AC-01–AC-19 retain their original identities. AC-20–AC-23 add the explicit guest-access, failure/retry and scanner-acknowledgment contracts from the latest agreed decisions. Prototype-only controls remain excluded.

- **AC-01:** Given published events, when a guest opens the catalog and selects one, then the catalog/details present that event's required purchase information and the selection identifies that event, without exposing unpublished purchase flows.
- **AC-02:** Given a published event with sufficient available tickets and valid guest name/email/phone and quantity, when an order is confirmed, then one PENDING_PAYMENT order reserves the chosen quantity for 15 minutes and the customer can view its payment summary without registration.
- **AC-03:** Given invalid guest input or insufficient available inventory, when order creation is attempted, then no successful order/reservation exceeding the event's available inventory is produced and the customer receives an observable failure.
- **AC-04:** Given a ticket price, quantity, and configured fee percentage, when the order is created, then the server records total_amount, platform_fee_percent, platform_fee_amount, and organizer_revenue according to CONTEXT.md; a modified client total/fee cannot override them.
- **AC-05:** Given a PENDING_PAYMENT order without a timely slip, when its original 15-minute reservation expires, then it becomes EXPIRED, its inventory reservation is released, and an expired upload cannot advance it; reloading the page cannot extend expiry.
- **AC-06:** Given an eligible order and a permitted slip, when upload succeeds, then it becomes WAITING_FOR_VERIFY without issuing tickets; a missing/invalid/oversized or duplicate slip is rejected according to the agreed upload policy. Only genuine JPEG/PNG files at most 5,242,880 bytes are permitted (F1); storage/validation failure cannot advance the order.
- **AC-07:** Given a pending payment review, when an ADMIN opens verification, then they can inspect its order/buyer/amount/slip information; an unauthenticated user or ORGANIZER cannot authorize approval/rejection.
- **AC-08:** Given a WAITING_FOR_VERIFY order, when ADMIN approval succeeds, then verification records its staff/time, the order becomes PAID, and exactly the purchased quantity of tickets is issued through the decoupled paid-order boundary.
- **AC-09:** Given a WAITING_FOR_VERIFY order, when ADMIN rejection succeeds, then the order becomes REJECTED, the customer receives a rejection notification, and no tickets are issued from that decision.
- **AC-10:** Given an issued order with multiple tickets, when their QR credentials are inspected and used, then each ticket has a distinct CSPRNG 32-byte secret and unique QR, the database holds its SHA-256 hash, and a ticket number alone is not a valid scan credential.
- **AC-11:** Given an approved order whose tickets are issued, when the ticket email is delivered, then it includes all purchased tickets and their event name/date/time/venue, ticket numbers, individual QRs, quantity, and order information.
- **AC-12:** Given a valid secure order view token, when the customer opens View My Tickets, then only that order's tickets/QRs and relevant current statuses are displayed without login; a missing/invalid token cannot expose private tickets or buyer details.
- **AC-13:** Given an authenticated Organizer, when a scan is submitted, then the server enforces permission for the selected event and does not accept a forged client staff identity or unauthorized event.
- **AC-14:** Given an unknown, wrong-event, unpaid-order, or cancelled ticket, when scanned, then entry is denied with clear invalid feedback and no ticket entry/exit state change.
- **AC-15:** Given a valid paid ticket OUTSIDE for the selected event, when CHECK_IN succeeds, then its state becomes INSIDE and feedback identifies a VALID TICKET, ticket number, event, and checked-in status.
- **AC-16:** Given a ticket already INSIDE, when CHECK_IN is attempted again, then the result is ALREADY CHECKED IN, with no duplicate entry state change.
- **AC-17:** Given a valid INSIDE ticket, when CHECK_OUT succeeds, then it becomes OUTSIDE and a subsequent valid CHECK_IN becomes INSIDE again; an OUTSIDE ticket cannot be successfully checked out.
- **AC-18:** Given any scan attempt, when its result is produced, then an attributable audit record captures its time, staff, action, result, and known ticket association, including rejected attempts; selected event is recorded separately from any known ticket event, unknown-ticket association is null, and audit failure cannot commit a successful state change.
- **AC-19:** Given these views on mobile or desktop, when users read required content and operate primary controls, then the content/actions remain accessible and usable, status/error outcomes are discernible without relying only on color, and the UI respects D-01–D-08: dark TICKETBOX surfaces, original-color event imagery, event-led hierarchy, semantic statuses with text/icons, side-by-side desktop order/slip and mobile order → slip → actions, plus large readable individual QRs. Exact pixel reproduction is not required.

- **AC-20:** Given a created guest order, when private checkout or ticket data is requested, then checkout and email-view capabilities are separate, scoped and validated; readable IDs and a checkout token cannot expose admission QRs. Valid ticket viewing/resend returns the original private R2 artifact; no raw admission secret is persisted in the database, public object URL or ordinary logs.
- **AC-21:** Given a waiting order, when QR preparation or issuance fails, then no paid approval/partial ticket set is committed, the order remains WAITING_FOR_VERIFY with retry feedback, and successful repeated/concurrent retry yields exactly the purchased tickets with no duplicates.
- **AC-22:** Given successful issuance, when ticket-email delivery fails or is unconfirmed, then PAID and the existing tickets remain, the delivery state survives reload, and ADMIN can manually resend the same ticket QRs/view link without issuing more tickets; retry failure remains visible and cannot be reported as delivered.
- **AC-23:** Given any returned scan result, when staff reads it, then a large text/icon result appears below the camera without covering it; further captures/submissions pause until “สแกนคนถัดไป” resumes scanning, and acknowledgment neither resubmits the scan nor changes ticket state. Camera/server failure cannot masquerade as valid admission.

## Verification plan

Follow CONTEXT.md: `unit-test: auto`, `integration-test: off`, `e2e-test: off`, and `code-review: required`. Use meaningful unit checks where justified, observable API/database/browser checks, responsive/accessibility inspection, and required review. This specification does not enable integration/e2e suites or claim production tests have already run. The prior prototype browser inspection is simulation evidence only.

| AC | Observable verification |
| --- | --- |
| AC-01 | Load published-event fixtures and an unpublished event; inspect listing/details and selected event identity. |
| AC-02 | Create a valid guest order; inspect its persisted quantity/status/reservation/expiry and resulting payment summary. |
| AC-03 | Submit invalid fields, non-positive quantity, and quantities exceeding inventory, including competing orders; inspect rejection and final inventory. |
| AC-04 | Use the requirement's 399 THB × 3 example with 5% (1,197 total, 59.85 fee, 1,137.15 organizer revenue), then another configured fee; tamper with client values and inspect persisted server values. |
| AC-05 | Advance controlled server time past the original expiry, reload the payment view, inspect released inventory, and attempt an expired upload; also inspect an order already awaiting review to avoid false pending-payment expiry. |
| AC-06 | Submit a permitted file, missing file, wrong type, file beyond the chosen size limit, and repeated hash; inspect payment/order records and absence of issued tickets. Use valid JPEG/PNG, spoofed MIME/extension, 5,242,880-byte and 5,242,881-byte fixtures; reject duplicate hashes under competing submissions. |
| AC-07 | Observe the actual review/slip data as ADMIN, then attempt the same decision endpoints as guest/ORGANIZER and inspect denial/state immutability. |
| AC-08 | Approve a pending order and inspect reviewer/time, PAID state, and ticket count; repeat/concurrently submit approval and ensure total issued tickets still equals purchased quantity. |
| AC-09 | Reject a pending order; inspect REJECTED state, notification content, and absence of tickets. |
| AC-10 | Compare individual QR payloads, validate their hashes against stored values, inspect absence of raw QR secrets in database/logs, and attempt scanning a readable ticket number. |
| AC-11 | Inspect the development email output/provider result for all tickets and required content; decode each displayed QR to its intended ticket credential. Verify provider acceptance separately from inbox delivery and persisted failure/unconfirmed state. |
| AC-12 | Open the order link in an unauthenticated browser, then try missing/invalid tokens and another order; inspect scope, privacy, current ticket statuses, and QR redisplay after a fresh request. Compare original QR payload/artifact before and after fresh view/resend; try checkout token at ticket endpoint and ticket token at checkout endpoint. |
| AC-13 | Submit scans as an authorized Organizer, another Organizer, and without a session; vary event/client staff identity and inspect permission results. |
| AC-14 | Scan fixtures for unknown/wrong-event/unpaid/cancelled tickets; inspect rejection, unchanged state, and audit outcomes. |
| AC-15 | Scan an eligible OUTSIDE ticket; inspect INSIDE persistence, feedback, and staff/time audit. |
| AC-16 | Scan that INSIDE ticket again, including competing submissions; inspect ALREADY CHECKED IN and no duplicate state change. |
| AC-17 | Run CHECK_IN → CHECK_OUT → CHECK_IN and try CHECK_OUT while OUTSIDE; inspect persisted transitions and result feedback. |
| AC-18 | Inspect successful, duplicate, invalid-action, cancelled, wrong-event, and unknown-ticket scan records; ensure failed cases are not silently omitted. Inspect nullable ticket linkage, selected event and result in TicketScan; force audit failure and inspect rollback. |
| AC-19 | Inspect narrow/mobile and desktop views, keyboard/focus/labels, text/QR readability, navigation/control availability, and status/error messaging; compare information hierarchy and core flows with the referenced revisions against D-01–D-08; use the explicitly accepted v2 references. |
| AC-20 | Create orders A/B; exchange capabilities, omit/mutate tokens, enumerate IDs and attempt direct R2 access. Inspect DB/logs and protected response cache/referrer policy; ensure email link and redisplayed artifacts stay scoped/original. |
| AC-21 | Inject R2 preparation and DB issuance failures; inspect waiting/payment/inventory and zero partial tickets; retry and race Approve requests; inspect exact cardinality and orphan cleanup without deleting committed artifacts. |
| AC-22 | Inject provider failure/timeout and process interruption, reload Admin, manually resend and fail resend again. Compare ticket IDs, original QR bytes and view link; test overlapping resend and truthful SENT/PENDING/FAILED state. |
| AC-23 | Use entry/exit/duplicate/invalid results plus camera denial and server failure; inspect below-camera feedback, disabled capture/submission, keyboard acknowledgment, no repeated request/state change and resumed next scan. |

## Decision resolution and readiness

| Earlier gap | Resolution |
| --- | --- |
| B-01 UI evidence acceptance | Resolved by explicit user acceptance “ยอมรับทั้ง 6 หน้า v2” on 2026-10-06; design authority remains D-01–D-08. |
| B-02 QR redisplay | S1 and ADR-0002; private original QR reference and application-authorized retrieval, AC-10/12/20. |
| B-03 every-scan audit | S2 and ADR-0002; nullable association + selected event/result and transactional audit, AC-18. |
| B-04 private checkout access | S3 and ADR-0002; separate capabilities and bounded issuance/request contract, AC-20. |
| B-05 upload limits | F1; JPEG/PNG actual-byte validation, 5 MB convention fixed above, AC-06. |
| B-06 issuance/email failures | R1/R2; atomic paid-ticket boundary and persistent delivery/manual resend, AC-21/22. |
| B-07 API payloads | Bounded API success/error/state contracts in this document; no unrelated endpoints/features. |

Remaining non-blocking implementation details: camera decoder choice, precise component/font/spacing, private artifact key layout and indexes beyond the required lookup invariants, expiry-maintenance trigger, and provider configuration. They do not authorize a scheduler, new service or expanded product scope.

No product conflict remains against the latest agreed decisions. Older technical examples requiring a Reject reason, public order-ID access, success-only scan storage or independent partial approval are superseded by this owning contract and ADR-0002. v2 simulation persistence/fake artifacts do not supply production security or durability guarantees.

## Next workflow

All blocking questions B-01–B-07 are resolved within the cited decisions, explicit acceptance and this bounded contract. Status is `ready`; next use `$to-tasks` for implementation-ready slices and full AC coverage. Existing SPEC-001 tasks and completion evidence remain unchanged. No tasks or production code are created by this reconciliation.
