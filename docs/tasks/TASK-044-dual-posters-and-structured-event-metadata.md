# TASK-044: Dual Posters & Structured Event Metadata with Google Maps Navigation

- Status: done
- Spec: [SPEC-015-dual-posters-student-privilege-and-gate-delegation.md](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)

## Goal

Support dual posters (Portrait 4:5 for cards/catalog and Landscape 16:9 for hero banner/checkout), structured event metadata (Artist Lineup, Music Genre, Entry Rules, Doors Open, Show Start/End Time, Sale Window Start/End, and Google Maps URL), structured multi-step event forms for Organizer & Admin, and customer event detail view with a clickable Google Maps navigation button (AC-01, AC-02, AC-05, AC-16).

Authoritative references:
- Spec: [SPEC-015](../specs/SPEC-015-dual-posters-student-privilege-and-gate-delegation.md)
- Context: [CONTEXT.md](../../CONTEXT.md) (Invariant 21)
- Prototypes: `org-events-v5`, `admin-events-v4`, `event-v6`

## Blocked by

- None

## Todo

- [x] Update `prisma/schema.prisma` with `poster_vertical_url`, `poster_horizontal_url`, `artists`, `genre`, `doors_open_time`, `show_start_time`, `show_end_time`, `sale_start_at`, `sale_end_at`, `google_maps_url`, and `entry_rules` on the `Event` model and run migration.
- [x] Update event CRUD API endpoints (`POST /api/organizer/events`, `PUT /api/organizer/events/[id]`, `PUT /api/admin/events/[id]`) to validate and persist the new structured fields.
- [x] Update event creation and editing modals in `/organizer/events` and `/admin/events` with structured steps, dual poster dropzones (4:5 portrait and 16:9 landscape), and a Google Maps URL input with a live "ทดสอบเปิด Map ↗" button.
- [x] Update public event detail page (`src/app/events/[id]/page.tsx`) to display the 16:9 landscape hero banner, show timing breakdown (Doors Open vs Show Time), and the clickable `📍 เปิด Google Maps นำทาง ↗` button under Venue.
- [x] Verify database migration applies cleanly with `npx prisma db push` and existing event records remain compatible.
- [x] Verify event creation and editing with dual posters and Maps link via typecheck (`npm run typecheck`) and lint (`npm run lint`).
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
