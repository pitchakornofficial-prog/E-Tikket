# SPEC-013: Operational Mastery (Gate Scanner Manual Search and Organizer Event CRUD)

- Status: done
- Requirement: [docs/requirement.md](../../docs/requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

1. **Scanner Resiliency for Gate Staff:**
   - When customer phone screens are damaged/cracked, brightness is too low, or camera sensors fail, staff cannot scan the QR code.
   - Staff need an alternative way to check in attendees by searching for their ticket code (e.g., `TK-...`) or buyer name/phone directly in the scanner interface.
2. **Organizer Event Creation and Modification:**
   - Organizers can currently only view their assigned concerts and download CSV reports or analytics, but cannot create new concerts or edit event details (title, description, venue, date, time, ticket price, total tickets, status).
   - Platform Admins shouldn't have to manually create every concert on behalf of organizers.

The observable outcome of this feature is:
- A "ค้นหาตั๋วด้วยตนเอง (Manual Lookup)" modal inside both the Organizer Scanner (`src/components/organizer-scanner.tsx`) and Mobile Gate Scanner (`src/app/scanner/[token]/page.tsx`). Staff can type a ticket number or name, see matching tickets for the event, and tap "Check-in" or "Check-out" directly.
- API endpoints `POST /api/organizer/events` and `PUT /api/organizer/events/[id]` enabling organizers to create and update their concerts, along with an interactive Create/Edit Event modal in `/organizer/events`.

## In scope

1. **Gate Scanner Manual Ticket Lookup & Check-in:**
   - Manual search trigger button in scanner UI.
   - Modal to search tickets by ticket number, buyer name, or phone for the selected event.
   - Instant 1-tap Check-in / Check-out button for found tickets, recording the scan audit log.
2. **Organizer Event Management CRUD:**
   - API endpoints:
     - `POST /api/organizer/events`: Create a new event assigned to the authenticated organizer.
     - `PUT /api/organizer/events/[id]`: Update event details (name, category, description, venue, eventDate, startTime, ticketPrice, totalTickets, status, imageUrl) owned by the organizer.
   - Modal UI in `/organizer/events`: "สร้างคอนเสิร์ตใหม่ (+ Create Event)" button and "แก้ไข (Edit)" button on event cards.
   - Poster image upload support for organizers.

## Out of scope

- Multi-tier seat map configuration (strictly single general admission tier per MVP scope).
- Automated refund processing upon event cancellation.

## Acceptance Criteria

- **AC-01:** Gate scanners (Organizer & Staff) include a manual ticket search tool allowing check-in without a functioning camera.
- **AC-02:** Manual check-in records a valid audit scan log with checker/staff identity.
- **AC-03:** `POST /api/organizer/events` validates required fields and creates a concert linked to the logged-in organizer.
- **AC-04:** `PUT /api/organizer/events/[id]` permits organizers to update their event details while enforcing authorization checks.
- **AC-05:** Organizer portal UI allows creating and editing concerts directly from `/organizer/events`.
- **AC-06:** All UI elements strictly follow the monochromatic black & white high-contrast aesthetic.
