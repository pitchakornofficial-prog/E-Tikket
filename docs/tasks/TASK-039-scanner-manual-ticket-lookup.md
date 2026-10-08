# TASK-039: Gate Scanner Manual Ticket Lookup & Check-in Search Modal

- Status: done
- Spec: [docs/specs/SPEC-013-scanner-manual-search-and-organizer-event-crud.md](../../docs/specs/SPEC-013-scanner-manual-search-and-organizer-event-crud.md)

## Goal

Provide gate checkers and organizers with an alternative way to check in attendees when camera scanning fails:
1. An endpoint or capability to search tickets by ticket number, attendee name, or phone number within the selected event.
2. A manual lookup modal in `OrganizerScanner` (`src/components/organizer-scanner.tsx`) and Mobile Gate Scanner (`src/app/scanner/[token]/page.tsx`).
3. Direct 1-tap "Check-in" or "Check-out" actions that record audit logs.

Read:
- `src/components/organizer-scanner.tsx`
- `src/app/scanner/[token]/page.tsx`
- `src/app/api/organizer/checkin/route.ts`
- `src/app/api/scanner/[token]/checkin/route.ts`

## Blocked by

None

## Todo

- [x] Support ticket number lookup / manual check-in in scan API routes (AC-01, AC-02).
- [x] Create manual ticket search UI modal in `OrganizerScanner` (AC-01).
- [x] Create manual ticket search UI modal in Mobile Gate Scanner (AC-01).
- [x] Provide 1-tap Check-in/Check-out for returned tickets with audio/haptic feedback (AC-02).
- [x] Ensure monochromatic styling consistency (AC-06).
- [x] Verify typecheck and linting pass with 0 errors.
