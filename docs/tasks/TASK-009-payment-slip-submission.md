# TASK-009: Guests submit a valid unique slip and wait for Admin verification

- Status: done
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver private slip submission and its checkout UI. Read the owning spec's Payment and expiry, upload API and F1 policy, [ADR-0002](../adr/0002-ticket-artifacts-guest-access-and-scan-audit.md), and [CONTEXT.md](../../CONTEXT.md). Reuse TASK-008's capability/reservation boundary and TASK-006 private R2/unique hash representation. Accepted [checkout-v2](../assets/prototype/checkout.html) is visual evidence.

## Blocked by

- [TASK-008](TASK-008-guest-reservation-checkout.md)

## Todo

- [x] Own AC-06 fully; complete the upload gate portion of AC-05 jointly with TASK-008; own partial AC-19 (slip states) and AC-20 (private slip submission). See [the coverage map](SPEC-002-task-map.md) for complementary ownership.
- [x] Implement multipart POST /api/orders/[id]/slip using checkout Bearer authorization, server time strictly before expiry and PENDING_PAYMENT. Validate actual decoded JPEG/PNG bytes, not just extension/MIME; limit to 5,242,880 bytes and calculate SHA-256 over the file. Return spec 404/422/413/415/409/503 errors without revealing private records.
- [x] Store slip bytes privately; atomically recheck order eligibility, persist payment evidence/unique slip hash and transition to WAITING_FOR_VERIFY. Serialize expiry-versus-upload and duplicate/competing uploads. Storage/DB/validation failure must not accept payment or issue tickets; best-effort remove only unreferenced upload objects.
- [x] Connect file selection/preview and submitting/error feedback to the actual endpoint. Show waiting only after confirmation, stop inappropriate pending-payment expiry messages and handle expired/stale states from server responses. Preserve accessible dark TICKETBOX UI; no public slip URL, admission QR or demo Admin transition.
- [x] Verify genuine JPEG/PNG, missing/corrupt/spoofed files, unsupported formats and valid-image fixtures at 5,242,880 and 5,242,881 bytes. Inspect accepted order/payment and zero tickets; race duplicate hashes across orders and competing upload/expiry. Try wrong capability/state and injected R2/DB failure, inspecting unchanged acceptance and orphan cleanup.
- [x] Inspect upload/preview/error/waiting/expired states and keyboard operation on mobile/desktop; reload waiting and expired orders to confirm durable status and the original reservation rules.
- [x] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [x] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [x] Review approved — target files (`src/app/api/orders/[id]/slip/route.ts`, `src/app/checkout/[id]/page.tsx`, `src/lib/storage.ts`) against HEAD; AC-06 fully, AC-05 (upload gate), AC-19 (slip states), AC-20 (private submission) verified; typecheck, lint, and build verified; no findings.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.

