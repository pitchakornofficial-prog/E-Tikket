# TASK-033: Attendee and Order CSV Export API Endpoint

- Status: done
- Spec: [docs/specs/SPEC-010-attendee-csv-export.md](../../docs/specs/SPEC-010-attendee-csv-export.md)

## Goal

Implement the secure CSV export API route `GET /api/events/[id]/export` supporting both `type=attendees` (per-ticket gate check-in sheet) and `type=orders` (per-order financial & ticket summary). Enforce role authorization (Platform `ADMIN` can export any event, `ORGANIZER` can export only their assigned events). Format the output with UTF-8 BOM (`\uFEFF`) and RFC 4180 escaping for perfect Excel and Google Sheets Thai language display.

Read:
- [docs/specs/SPEC-010-attendee-csv-export.md](../../docs/specs/SPEC-010-attendee-csv-export.md)
- `src/lib/auth.ts`
- `src/lib/prisma.ts`

## Blocked by

- None

## Todo

- [x] Implement CSV formatting utility `src/lib/csv.ts` with RFC 4180 escaping, UTF-8 BOM prefix, and cell formatting (AC-04).
- [x] Create endpoint `src/app/api/events/[id]/export/route.ts` with authentication and role authorization checks for ADMIN and ORGANIZER (AC-01, AC-02, AC-03).
- [x] Implement `type=attendees` export logic querying issued tickets, order contact info, and scan status (AC-01).
- [x] Implement `type=orders` export logic querying order revenue, quantity, status, and tickets list (AC-02).
- [x] Return response with appropriate `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="<event>_<type>_<date>.csv"` headers (AC-01, AC-02).
- [x] Verify endpoint response, CSV encoding, and forbidden access handling via tests or verification script.
