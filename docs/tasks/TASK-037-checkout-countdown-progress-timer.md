# TASK-037: Checkout 15-Minute Countdown Progress Bar & Urgency Alerts

- Status: done
- Spec: [docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md](../../docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md)

## Goal

Enhance the checkout page (`src/app/checkout/[id]/page.tsx`) with:
1. An animated visual progress bar reflecting time remaining out of 15 minutes (900 seconds).
2. Urgent styling and pulsating warning indicator when remaining time is less than 3 minutes (180s).
3. Immediate graceful handling when timer reaches 0, refreshing order status and prompting user with a return-to-catalog button.

Read:
- `src/app/checkout/[id]/page.tsx`
- [docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md](../../docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md)

## Blocked by

None

## Todo

- [x] Calculate percentage progress (`(timeRemaining / 900) * 100`) and render an animated progress bar in `#timer-banner` (AC-01).
- [x] Add urgent visual styling (pulse effect, warning callout) when remaining time < 180 seconds (AC-02).
- [x] Ensure automatic expiry state update and prominent return button when timer reaches 0 (AC-03).
- [x] Adhere to monochromatic high-contrast design system in light and dark modes (AC-06).
- [x] Verify typecheck and linting pass with 0 errors.
