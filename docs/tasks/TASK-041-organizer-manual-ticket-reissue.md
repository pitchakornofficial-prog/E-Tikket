# TASK-041: Organizer Manual Ticket Reissue API & Dashboard UI

- Status: done
- Spec: [docs/specs/SPEC-014-resilience-lifecycle-and-organizer-reissue.md](../../docs/specs/SPEC-014-resilience-lifecycle-and-organizer-reissue.md)

## Goal

Allow event organizers to cancel and reissue an attendee's un-scanned ticket directly from the organizer dashboard (e.g., when a buyer reports a leaked QR code or lost email access).

Read:
- `src/app/api/organizer/events/[id]/route.ts`
- `src/app/organizer/events/page.tsx`
- `src/app/api/tickets/reissue/route.ts`

## Blocked by

None

## Todo

- [x] Create `POST /api/organizer/events/[id]/reissue` endpoint verifying organizer ownership and event association (AC-01).
- [x] Cancel old ticket and issue replacement ticket with new CSPRNG QR secret and `-R` ticket number (AC-01).
- [x] Add "ออกตั๋วใหม่ (Reissue)" button on ticket items in Organizer Event details modal (AC-02).
- [x] Confirmation dialog warning that the old QR code will become CANCELLED immediately (AC-02).
- [x] Verify monochromatic design consistency (AC-05).
