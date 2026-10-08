# SPEC-009: Dynamic PromptPay QR Code & Customer Email Confirmation

- Status: ready
- Requirement: [Customer UX Improvements: Prevent Email Typos and Generate Dynamic PromptPay QR Code with Exact Amount]
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

1. **Email Typo Ticket Loss:** In a guest checkout system without customer passwords, tickets and order URLs are tied to the email address. If an attendee mistypes their email (e.g., `user@gmai.com`), they never receive order confirmations, cannot look up tickets on `/my-tickets`, and may fail entry.
2. **Payment Friction & Manual Amount Errors:** The current checkout page displays static bank account details and a sample placeholder QR code. Buyers have to manually memorize the account number, open their banking app, select the bank, type the account number, and manually enter the amount. This leads to transfer errors (e.g., wrong amount or wrong account) and payment delays.

By introducing:
1. **Confirm Email Field in Ticket Purchase Form:** Attendees must confirm their email before placing an order, with real-time validation to prevent mismatches and typos.
2. **Dynamic PromptPay QR Code Generator:** Generate standard EMVCo PromptPay QR payloads with the exact order total amount (e.g. ฿1,197.00) and render a scannable QR code via the `qrcode` library, alongside quick "Copy PromptPay Number" and "Copy Amount" buttons.

## In scope

1. **Ticket Purchase Form (`src/components/ticket-purchase-form.tsx`):**
   - Add "ยืนยันอีเมล (Confirm Email)" input field below the email input.
   - Real-time client validation showing warning if emails do not match.
   - Form submission block if emails do not match or are invalid.
2. **PromptPay EMVCo Payload Utility (`src/lib/promptpay.ts`):**
   - Pure TypeScript generator producing standard EMVCo CRC-16 checksummed PromptPay payloads for mobile numbers (e.g. 08x-xxx-xxxx) or National ID / Tax IDs with precise transaction amount.
   - Unit test coverage for EMVCo CRC-16 and format correctness.
3. **Orders API (`src/app/api/orders/[id]/route.ts`):**
   - Dynamically generate the PromptPay QR DataURL (using `qrcode.toDataURL`) with the order's exact `totalAmount` and the configured PromptPay account.
   - Return PromptPay target and generated QR DataURL to the checkout page.
4. **Checkout Page (`src/app/checkout/[id]/page.tsx`):**
   - Render the real scannable PromptPay QR code with exact amount tag.
   - Add one-click copy buttons for PromptPay number and total amount.
   - Preserve existing bank transfer information as fallback.
   - Retain full monochromatic light and dark mode styling.

## Out of scope

- Automated bank webhook listeners or external paid payment gateway integrations.
- Customer account creation (system remains guest checkout).

## Acceptance Criteria

- AC-01: The Ticket Purchase Form displays a "ยืนยันอีเมล" (Confirm Email) field immediately after the Email field.
- AC-02: If the confirmation email does not match the entered email, the form displays an inline error message and disables order submission.
- AC-03: On the checkout page (`/checkout/[id]`), the payment card displays a scannable Dynamic PromptPay QR Code containing the order's exact amount.
- AC-04: Scanning the QR code with any standard Thai banking app pre-fills the recipient and exact amount matching the order total.
- AC-05: The checkout page provides one-click copy buttons for the PromptPay number and the order total amount with temporary copied feedback.
- AC-06: If PromptPay is not configured or fails to generate, the checkout page gracefully falls back to the manual bank account transfer info.
- AC-07: All updated components support high-contrast Monochromatic Light and Dark themes.

## Verification Plan

| AC | Verification |
| --- | --- |
| AC-01, AC-02 | Test ticket form on event detail page; test mismatched email validation block and matched email successful submission. |
| AC-03, AC-04, AC-05 | Open checkout page for newly created order; verify PromptPay QR code renders and copy buttons function properly. |
| AC-06, AC-07 | Verify light/dark theme contrast and run `npm run typecheck` & `npm run build`. |
