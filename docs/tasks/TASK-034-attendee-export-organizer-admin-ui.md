# TASK-034: Organizer and Admin UI CSV Export Integration

- Status: done
- Spec: [docs/specs/SPEC-010-attendee-csv-export.md](../../docs/specs/SPEC-010-attendee-csv-export.md)

## Goal

Integrate CSV Export capabilities into both the Organizer Concerts dashboard (`/organizer/events`) and the Admin Concerts dashboard (`/admin/events`). Provide intuitive export buttons / dropdown options on event cards and within the event detail modal, allowing one-click download of Attendee Lists and Order Summaries with clear loading feedback.

Read:
- [docs/specs/SPEC-010-attendee-csv-export.md](../../docs/specs/SPEC-010-attendee-csv-export.md)
- `src/app/organizer/events/page.tsx`
- `src/app/admin/events/page.tsx`

## Blocked by

- TASK-033

## Todo

- [x] Add direct CSV export action on concert cards in `src/app/organizer/events/page.tsx` allowing download of either "รายชื่อผู้เข้างาน (CSV)" or "สรุปคำสั่งซื้อ (CSV)" (AC-05).
- [x] Update event details modal in `src/app/organizer/events/page.tsx` to offer both Attendee-level and Order-level CSV export (AC-05).
- [x] Add CSV export action on concert cards in `src/app/admin/events/page.tsx` for platform administrators (AC-06).
- [x] Ensure download triggers, loading spinners, and error alerts provide clear feedback in monochromatic styling (AC-05, AC-06).
- [x] Verify typecheck passes with 0 errors and production build succeeds.
