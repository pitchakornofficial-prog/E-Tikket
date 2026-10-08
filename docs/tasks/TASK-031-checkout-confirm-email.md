# TASK-031: Ticket Purchase Form Email Confirmation Field

- Status: done
- Spec: [docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md](../../docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md)

## Goal

Enhance `src/components/ticket-purchase-form.tsx` to add a "ยืนยันอีเมล (Confirm Email)" field with real-time match validation, preventing attendees from losing access to tickets due to typing errors.

Read:
- [docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md](../../docs/specs/SPEC-009-promptpay-qr-and-confirm-email.md)
- `src/components/ticket-purchase-form.tsx`

## Blocked by

- None

## Todo

- [x] Add `confirmEmail` state and input field in `src/components/ticket-purchase-form.tsx` directly below customerEmail (AC-01).
- [x] Add real-time validation indicator and submission guard when `confirmEmail !== customerEmail` (AC-02).
- [x] Ensure clean monochromatic light and dark mode styles for input states and error messages (AC-07).
- [x] Verify typecheck passes without regression.
