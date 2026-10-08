# TASK-038: Catalog Timeframe and Available Stock Filters

- Status: done
- Spec: [docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md](../../docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md)

## Goal

Enhance `src/components/event-catalog-browser.tsx` with:
1. Quick timeframe filter pills ("ทั้งหมด", "7 วันข้างหน้า", "เดือนนี้").
2. "เฉพาะงานที่มีบัตรจำหน่าย (In Stock Only)" toggle switch/pill.
3. Integrate these filters with existing keyword search, category pills, sorting options, and pagination.

Read:
- `src/components/event-catalog-browser.tsx`
- [docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md](../../docs/specs/SPEC-012-checkout-timer-and-catalog-filters.md)

## Blocked by

None

## Todo

- [x] Add `timeframe` state ("all" | "7days" | "30days") and filter logic based on `eventDate` (AC-04).
- [x] Add `inStockOnly` state and filter logic checking `availableQuantity > 0` (AC-04).
- [x] Reset `currentPage` to 1 whenever any filter changes (AC-05).
- [x] Style filter buttons with monochromatic high-contrast design (AC-06).
- [x] Verify typecheck and linting pass with 0 errors.
