# TASK-032: Dynamic PromptPay QR Generator & Checkout Integration

- Status: done
- Spec: [docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md](../../docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md)

## Goal

Create a pure TypeScript EMVCo PromptPay payload generator (`src/lib/promptpay.ts`), integrate dynamic PromptPay QR generation into `src/app/api/orders/[id]/route.ts`, and display the scannable QR with exact order total and one-click copy buttons in `src/app/checkout/[id]/page.tsx`.

Read:
- [docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md](../../docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md)
- `src/app/api/orders/[id]/route.ts`
- `src/app/checkout/[id]/page.tsx`

## Blocked by

- TASK-031

## Todo

- [x] Implement standard EMVCo CRC-16 checksum and PromptPay payload generation in `src/lib/promptpay.ts` (AC-03, AC-04).
- [x] Update `src/app/api/orders/[id]/route.ts` to generate dynamic QR DataURL via `qrcode` with the order's exact amount (AC-03, AC-04).
- [x] Update `src/app/checkout/[id]/page.tsx` to display PromptPay QR code, amount indicator, and one-click copy buttons with copied feedback (AC-03, AC-05, AC-06, AC-07).
- [x] Verify light/dark theme contrast and run typecheck/build checks.
