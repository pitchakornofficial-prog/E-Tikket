# TASK-040: Organizer Event Creation and Editing API & Form UI

- Status: done
- Spec: [docs/specs/SPEC-013-scanner-manual-search-and-organizer-event-crud.md](../../docs/specs/SPEC-013-scanner-manual-search-and-organizer-event-crud.md)

## Goal

Allow Organizers to create new concerts and modify their existing events:
1. `POST /api/organizer/events` to create a new event owned by the authenticated organizer.
2. `PUT /api/organizer/events/[id]` to update an event owned by the organizer.
3. Interactive Create & Edit Event modal in `src/app/organizer/events/page.tsx`.

Read:
- `src/app/api/organizer/events/route.ts`
- `src/app/api/organizer/events/[id]/route.ts`
- `src/app/organizer/events/page.tsx`
- `src/app/api/admin/events/route.ts`

## Blocked by

None

## Todo

- [x] Implement `POST /api/organizer/events` with validation and organizer ownership binding (AC-03).
- [x] Implement `PUT /api/organizer/events/[id]` with ownership verification (AC-04).
- [x] Add "สร้างคอนเสิร์ต (+ Create Event)" button and form modal in `/organizer/events` (AC-05).
- [x] Add "แก้ไข (Edit)" button and form modal for each concert in `/organizer/events` (AC-05).
- [x] Support poster image URL or upload (AC-05).
- [x] Ensure monochromatic styling consistency (AC-06).
- [x] Verify typecheck, linting, and build pass with 0 errors.
