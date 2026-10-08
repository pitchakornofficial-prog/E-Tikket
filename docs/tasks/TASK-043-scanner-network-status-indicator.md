# TASK-043: Mobile Gate Scanner Network Offline Indicator

- Status: done
- Spec: [docs/specs/SPEC-014-resilience-lifecycle-and-organizer-reissue.md](../../docs/specs/SPEC-014-resilience-lifecycle-and-organizer-reissue.md)

## Goal

Add a live network status indicator in the gate scanner interface to warn staff when cellular or Wi-Fi connectivity drops.

Read:
- `src/app/scanner/[token]/page.tsx`
- `src/components/organizer-scanner.tsx`

## Blocked by

None

## Todo

- [x] Add `navigator.onLine` listener in scanner components (AC-04).
- [x] Display an online/offline badge in scanner header (🟢 ออนไลน์ / 🔴 ขาดการเชื่อมต่อ) (AC-04).
- [x] Show prominent warning banner when device is offline to prevent false failed scans (AC-04).
- [x] Ensure monochromatic styling matches repository conventions (AC-05).
