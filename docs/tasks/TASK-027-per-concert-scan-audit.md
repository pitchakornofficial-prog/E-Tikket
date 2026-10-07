# TASK-027: Per-Concert Live Scan Audit Trail Filter & Column

- Status: done
- Spec: [docs/specs/SPEC-007-organizer-events-and-audit.md](../../docs/specs/SPEC-007-organizer-events-and-audit.md)

## Goal

Enhance the Live Scan Audit Trail so organizers can seamlessly filter scan records by specific concert or view all concerts combined. Update `GET /api/organizer/checkin/recent` to support `eventId=ALL` and return `eventName`. Add the Concert column to the scan table and event selection tabs directly inside the section.

Read:
- [docs/specs/SPEC-007-organizer-events-and-audit.md](../../docs/specs/SPEC-007-organizer-events-and-audit.md)

## Blocked by

- None

## Todo

- [x] Update `src/app/api/organizer/checkin/recent/route.ts` to support `eventId=ALL` (or empty eventId when scans are requested), returning scans across all organizer-owned events with `eventName` included (AC-01, AC-02).
- [x] Add direct concert selector pills/dropdown into the Live Scan Audit Trail section in `src/app/organizer/page.tsx` (AC-01).
- [x] Add the "งานคอนเสิร์ต" column in the Live Scan Audit Trail table (AC-02).
- [x] Verify light/dark mode and typecheck.
