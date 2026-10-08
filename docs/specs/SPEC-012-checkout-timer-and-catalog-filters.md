# SPEC-012: Enhanced Customer Experience (Checkout Urgency Timer and Catalog Date Filters)

- Status: done
- Requirement: [docs/requirement.md](../../docs/requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

1. **Checkout Urgency & Transparency:**
   - Buyers currently see a basic text timer on the checkout page, but lack visual progress (e.g. animated countdown bar), urgent warning thresholds (e.g. pulsating red badge under 3 minutes), and graceful auto-refresh with clear stock return feedback upon expiration.
2. **Event Discovery Experience:**
   - On the homepage (`/`), visitors can search by keyword and select a category, but cannot filter by event timeline ("เร็วๆ นี้", "สัปดาห์นี้", "เดือนนี้") or filter out sold-out events ("เฉพาะงานที่มีบัตร").

The observable outcome of this feature is:
- A high-contrast monochromatic countdown progress bar on `/checkout/[id]` that visually depletes across the 15-minute reservation window, shifts to an urgent pulsing state when under 3 minutes remain, and presents an instant one-click redirect to re-book upon expiration.
- Quick timeframe filter pills ("ทั้งหมด", "สัปดาห์นี้", "เดือนนี้", "เร็วๆ นี้") and an "เฉพาะงานที่มีบัตรจำหน่าย (In Stock Only)" toggle on the homepage catalog browser.

## In scope

1. **Checkout Countdown Progress Bar (`src/app/checkout/[id]/page.tsx`):**
   - 15-minute (900 seconds) percentage progress bar with smooth transition.
   - Urgent state when `< 180` seconds (3 minutes) remaining: warning banner, pulsing indicator, and amber/red accentuation.
   - Graceful expiration flow with immediate stock release notification and prominent button to re-select tickets.
2. **Catalog Filters (`src/components/event-catalog-browser.tsx`):**
   - Timeframe filter pills: "ทั้งหมด", "7 วันนี้", "เดือนนี้".
   - "ซ่อนงานที่บัตรหมด (Hide Sold Out)" toggle checkbox/pill.
   - Seamless combination of keyword search + category pill + timeframe + stock availability + sorting options.

## Out of scope

- WebSocket synchronization of ticket stock.
- Multi-currency or installment payments.
- SMS expiration alerts.

## Acceptance Criteria

- **AC-01:** On `/checkout/[id]`, when order status is `PENDING_PAYMENT`, a 15-minute progress bar visually tracks remaining seconds towards 0.
- **AC-02:** When time remaining drops below 180 seconds (3 minutes), the timer shifts to an urgent visual style with a warning message.
- **AC-03:** When the timer reaches 0, the UI automatically invalidates the reservation, marks status as expired, and offers a direct link back to the event page.
- **AC-04:** On `/`, users can filter concerts by date timeframe ("ทั้งหมด", "7 วันนี้", "เดือนนี้") and hide concerts where `availableQuantity <= 0`.
- **AC-05:** Catalog pagination updates correctly when filters change, resetting to page 1.
- **AC-06:** All UI elements strictly follow the monochromatic black & white high-contrast aesthetic and support both dark and light modes.
