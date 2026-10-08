# TASK-036: Event Sales & Peak Traffic Charts UI Component & Integration

- Status: done
- Spec: [docs/specs/SPEC-011-event-analytics-and-peak-charts.md](../../docs/specs/SPEC-011-event-analytics-and-peak-charts.md)

## Goal

Build an interactive, responsive Analytics UI modal `src/components/event-analytics-modal.tsx` and integrate it into `src/app/organizer/events/page.tsx`. Present:
1. Sales timeline chart displaying daily ticket volume and revenue.
2. Hourly gate arrival traffic chart highlighting peak rush hours.
3. Gate staff check-in distribution table/cards.
4. Summary KPI cards with high-contrast monochromatic light/dark styling.

Read:
- [docs/specs/SPEC-011-event-analytics-and-peak-charts.md](../../docs/specs/SPEC-011-event-analytics-and-peak-charts.md)
- `src/app/organizer/events/page.tsx`
- `src/components/icons.tsx`

## Blocked by

- TASK-035

## Todo

- [x] Create `src/components/event-analytics-modal.tsx` with sales trend bar visualization and peak check-in hourly curve (AC-03, AC-04).
- [x] Render staff gate distribution breakdown and KPI summary metrics (AC-04, AC-05).
- [x] Connect "ดูสถิติ & กราฟ (Analytics)" action button in `src/app/organizer/events/page.tsx` on each concert card (AC-03, AC-06).
- [x] Ensure full monochromatic styling consistency across light and dark modes (AC-06).
- [x] Verify typecheck and production build pass with 0 errors.
