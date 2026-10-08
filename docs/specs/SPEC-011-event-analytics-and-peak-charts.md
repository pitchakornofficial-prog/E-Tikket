# SPEC-011: Event Sales Analytics and Peak Check-in Traffic Charts

- Status: done
- Requirement: [docs/requirement.md](../../docs/requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

Organizers currently have basic aggregate numbers (total tickets sold, total revenue, total inside), but lack insight into:
1. **Sales velocity over time:** When tickets were bought (e.g. initial launch spike vs last-minute rush).
2. **Gate entry traffic distribution:** What time attendees arrived at the venue and when the entrance was most congested (peak scanning hours/minutes).
3. **Staff gate efficiency:** How many attendees entered through each gate or were scanned by each gate staff member.

The observable outcome of this feature is:
- A dedicated analytics API endpoint `GET /api/organizer/events/[id]/analytics` providing aggregated timeline data, hourly check-in distribution, and gate staff metrics.
- An interactive, clean monochromatic Analytics view inside the Organizer Events portal displaying:
  - Daily ticket sales and revenue trend bar/area visualization.
  - Gate check-in traffic curve (Peak arrival hour analysis).
  - Gate scanner distribution metrics.
  - Key performance indicators (Peak scan hour, average tickets per order, check-in completion rate).
- Role-based authorization ensuring only assigned Organizers and Platform Admins can view analytics.

## In scope

- Server-side analytics aggregation endpoint `GET /api/organizer/events/[id]/analytics`.
- Aggregations:
  - Daily sales timeline (date, tickets count, revenue amount).
  - Hourly/time-slot check-in distribution for `CHECK_IN` scans with `VALID` result.
  - Per-checker and per-gate scan distribution.
  - High-level KPIs: peak entry hour, check-in rate, average tickets per order.
- Responsive, pure SVG / CSS visual chart components adhering strictly to the monochromatic black & white design system.
- Integration into the Organizer Events portal (`/organizer/events`) with easy access to view analytics for any managed event.

## Out of scope

- Real-time WebSocket streaming (polling / manual refresh is sufficient for MVP).
- Third-party analytics trackers (Google Analytics, Mixpanel).
- Multi-event comparative benchmarks.

## User flow and behavior

### Primary Flow: Organizer Views Event Analytics
1. Organizer logs in and visits "จัดการคอนเสิร์ต" (`/organizer/events`).
2. Organizer clicks "ดูรายละเอียด & สถิติ" on an event card.
3. Inside the event view, Organizer selects the "สถิติ & กราฟวิเคราะห์ (Analytics)" tab or section.
4. The system presents:
   - **Sales Timeline Chart:** Daily bars showing ticket sales and revenue leading up to the event date.
   - **Gate Check-in Traffic Chart:** Hourly bar chart illustrating attendee arrival distribution and identifying the peak entry rush time.
   - **Staff Gate Breakdown:** Scan volume processed by each assigned staff member and entrance gate.
   - **Summary KPI Badges:** Peak arrival window, total sold, and current attendance percentage.

## Business rules and constraints

1. **Authorization:**
   - Platform `ADMIN` can view analytics for any event.
   - `ORGANIZER` can view analytics only for events they own (`event.organizerId === session.userId`).
2. **Scan Calculation Rules:**
   - Peak check-in charts only count successful entry scans (`action === "CHECK_IN"` and `result === "VALID"`).
   - Exit scans (`CHECK_OUT`) and rejected scans (`ALREADY_CHECKED_IN`, `INVALID`) are excluded from arrival rush calculations.
3. **Sales Calculation Rules:**
   - Only confirmed paid orders (`status === "PAID"`) are factored into revenue and sales curves.
4. **Theme & Design:**
   - Must strictly match the monochromatic High-Contrast Black & White aesthetic in both light and dark mode.

## Interfaces and observable test points

- **API Route:** `GET /api/organizer/events/[id]/analytics`
  - Response JSON:
    ```json
    {
      "event": { "id": "...", "name": "...", "eventDate": "...", "totalTickets": 500 },
      "kpis": {
        "totalSold": 450,
        "totalRevenue": 202500,
        "checkedInCount": 380,
        "checkinPercent": "84.4%",
        "peakTimeSlot": "18:00 - 19:00",
        "peakScanCount": 165,
        "avgTicketsPerOrder": "2.4"
      },
      "salesTrend": [
        { "date": "2026-10-01", "tickets": 120, "revenue": 54000 }
      ],
      "checkinDistribution": [
        { "timeSlot": "17:00", "count": 25 },
        { "timeSlot": "18:00", "count": 165 },
        { "timeSlot": "19:00", "count": 140 }
      ],
      "checkerStats": [
        { "name": "Staff Gate A", "gateNote": "Gate 1", "scansCount": 210 },
        { "name": "Staff Gate B", "gateNote": "Gate 2", "scansCount": 170 }
      ]
    }
    ```
- **UI Components:**
  - `src/components/event-analytics-modal.tsx`: Interactive modal displaying charts and KPIs.
  - Organizer Events card trigger button.

## Acceptance criteria

- AC-01: Given an authenticated Organizer, when calling `GET /api/organizer/events/[id]/analytics` for their event, then the API returns accurate sales timeline, peak check-in hourly buckets, and gate staff scan distribution.
- AC-02: Given an Organizer requesting analytics for an event belonging to another organizer, then the API responds with HTTP 403 Forbidden.
- AC-03: Given confirmed ticket orders across multiple dates, when viewing the sales trend chart, then daily ticket volume and revenue are rendered accurately in monochromatic bar/timeline visual.
- AC-04: Given valid entry scans across different hours on the event date, when viewing the check-in distribution chart, then scan volume per time slot is visualised and the peak arrival hour is clearly highlighted.
- AC-05: Given assigned gate staff who performed ticket check-ins, when viewing staff breakdown, then each staff member's total valid scans and gate position are displayed.
- AC-06: Given dark and light mode, all analytics charts and KPI cards render with high contrast and zero visual regressions.

## Verification plan

| AC | Verification |
| --- | --- |
| AC-01 | API endpoint test requesting `/api/organizer/events/[id]/analytics` verifies 200 OK and expected JSON schema with correct aggregation. |
| AC-02 | API authorization test verifies 403 Forbidden when organizer ID does not match. |
| AC-03 | Component rendering verification of sales trend bars with proper heights and labels. |
| AC-04 | Component rendering verification of checkin arrival traffic curve with peak badge. |
| AC-05 | Table/card verification of staff scan counters. |
| AC-06 | TypeScript typecheck and lint verification passes with 0 errors. |

## Open questions

None (feature scope and interfaces are finalized).
