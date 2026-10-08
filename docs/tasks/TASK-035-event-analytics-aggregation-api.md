# TASK-035: Event Analytics Server Aggregation API Endpoint

- Status: done
- Spec: [docs/specs/SPEC-011-event-analytics-and-peak-charts.md](../../docs/specs/SPEC-011-event-analytics-and-peak-charts.md)

## Goal

Create `GET /api/organizer/events/[id]/analytics` endpoint aggregating:
1. Daily sales timeline (tickets sold and revenue per day from confirmed `PAID` orders).
2. Hourly arrival / check-in distribution from valid `CHECK_IN` ticket scans.
3. Gate staff check-in volume distribution.
4. Summary KPIs (peak arrival hour, total sold, check-in completion rate, avg tickets/order).
Enforce role authorization so only assigned Organizers or Platform Admins can access analytics.

Read:
- [docs/specs/SPEC-011-event-analytics-and-peak-charts.md](../../docs/specs/SPEC-011-event-analytics-and-peak-charts.md)
- `src/lib/auth.ts`
- `src/lib/prisma.ts`

## Blocked by

- None

## Todo

- [x] Create route `src/app/api/organizer/events/[id]/analytics/route.ts` with session auth for ORGANIZER and ADMIN (AC-01, AC-02).
- [x] Implement ownership verification for ORGANIZER (`event.organizerId === session.sub`) (AC-02).
- [x] Aggregate daily sales trend from `PAID` orders grouped by date (AC-01).
- [x] Aggregate hourly check-in distribution from valid `CHECK_IN` scans with `VALID` result (AC-01).
- [x] Compute summary KPIs including peak scan time slot, check-in percentage, and staff breakdown (AC-01).
- [x] Verify endpoint response with tests / typecheck.
