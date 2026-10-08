# TASK-042: Event Catalog Past Events Filter & Timeframe Separation

- Status: done
- Spec: [docs/specs/SPEC-014-resilience-lifecycle-and-organizer-reissue.md](../../docs/specs/SPEC-014-resilience-lifecycle-and-organizer-reissue.md)

## Goal

Provide clean separation in the event catalog between upcoming concerts and past concerts that have already ended.

Read:
- `src/components/event-catalog-browser.tsx`
- `src/app/page.tsx`
- `src/app/api/events/route.ts`

## Blocked by

None

## Todo

- [x] Add timeframe filter toggle ("กำลังจัด/เร็วๆ นี้ (Upcoming)" vs "ที่จบไปแล้ว (Past Events)" vs "ทั้งหมด") in `src/components/event-catalog-browser.tsx` (AC-03).
- [x] Show badge "จบไปแล้ว (Ended)" on cards of past events (AC-03).
- [x] Ensure monochromatic styling matches repository conventions (AC-05).
