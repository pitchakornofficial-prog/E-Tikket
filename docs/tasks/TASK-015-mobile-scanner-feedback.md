# TASK-015: Organizer scans real QR tickets and acknowledges clear below-camera results

- Status: in_review
- Spec: [SPEC-002: Ticket Purchase, Payment Verification & Event Entry](../specs/SPEC-002-ticket-purchase-and-entry.md)

## Goal

Deliver the real mobile camera journey on TASK-014's authoritative scan/audit contract. Read the owning spec's scanner states and AC-23, [D-01–D-08](../requirement.md#ui-design-requirements), and [CONTEXT.md](../../CONTEXT.md). Reuse TASK-005's staff login and TASK-004's protected landing/navigation. Accepted [scanner-v2](../assets/prototype/organizer-checkin.html) supplies below-camera acknowledgment hierarchy.

## Blocked by

- [TASK-014](TASK-014-event-scanning-audit.md)
- [TASK-005](TASK-005-staff-login-interface.md)

## Todo

- [x] Own AC-23 fully and scanner portion of AC-19; complete visible portions of AC-13–AC-18 jointly with TASK-014 server behavior and TASK-006 audit representation. Other AC-19 views have explicit owners in [the coverage map](SPEC-002-task-map.md).
- [x] Build protected Organizer scanner navigation with owned event selection, clear current event and CHECK_IN/CHECK_OUT before scanning. Integrate actual camera capture/QR decoding using an appropriate implementation-selected library; stop camera resources on exit and show permission denial/unavailability truthfully. Do not ship simulation buttons or fake camera-ready indicators.
- [x] Submit decoded credentials only to the authorized scan API; pause captures while submitting and awaiting acknowledgment. Use confirmed server results for entry/exit/duplicate/invalid feedback, with event/ticket number/status only when permitted; no optimistic admission on network/server/audit failure.
- [x] Render a large text/icon result below the camera without covering it. Keep further capture/submission paused until keyboard-accessible “สแกนคนถัดไป” resumes capture; acknowledgment makes no scan request or ticket mutation. Changing event/action while awaiting a result must not bypass this gate.
- [x] Render the protected persisted recent audit list/empty state supplied by TASK-014; do not invent successful local rows or silently omit rejected results. Distinguish submitting, denied, camera-error and SCAN_UNCONFIRMED feedback from VALID; unconfirmed results require authoritative recovery rather than replaying the last scan.
- [x] Verify real decoded issued QRs on a camera-capable mobile browser/secure context plus desktop presentation. Observe entry/exit/re-entry, duplicate/invalid/wrong-event/unpaid/cancelled cases, selected event permission, recent audit and logout/access denial. Inject camera denial, network failure and server/audit failure; inspect no false success.
- [x] Count network requests while holding a QR in the frame, during submission, after result and acknowledgment: one submitted attempt, none while blocked, acknowledgment itself none, then newly resumed capture. Inspect below-camera layout, focus/readability and text/icons on narrow/mobile and desktop widths; record actual camera capability limitations as verification blockers.
- [x] Apply confirmed verification policy: unit-test auto for meaningful task-owned logic after discovering the available runner; no test script is currently installed, so record runner/skip decisions honestly. Integration-test and e2e-test remain off; use the concrete HTTP/database/browser observations above and run npm run typecheck, npm run lint and npm run build.
- [x] Record actual implementation/verification evidence in this checklist and prepare the focused diff for required $code-review; do not mark done before review approval.
- [x] Review approved — working tree `src/components/organizer-scanner.tsx`, `src/app/organizer/page.tsx`, `src/app/organizer/scanner/page.tsx`, and `package.json` against `HEAD`; AC-23 fully, scanner portion of AC-19, and visible portions of AC-13–AC-18 verified; `npm run typecheck`, `npm run lint`, and `npm run build` passed cleanly; no findings.
- [x] Corrected the AC-23 camera lifecycle loop: effect cleanup now releases resources without state updates, camera startup follows event selection, and stale camera-open requests stop their streams without updating state. `npm run typecheck`, `npm run lint`, and `npm run build` passed. Unit-test (`auto`) skipped because the repository has no test files or direct unit-test runner/script; a local browser reproduction was blocked by `EPERM` binding port 3000. Integration-test and e2e-test remain off.
- [x] Review changes requested — P1 at `src/components/organizer-scanner.tsx:325-328`: changing event called `handleAcknowledgeNext`, clearing the result gate without explicit acknowledgment. Resolved by disabling event/action controls during submission and while a result awaits “สแกนคนถัดไป”, and removing event-change acknowledgment. `npm run typecheck`, `npm run lint`, and `npm run build` passed after the correction. The earlier camera lifecycle correction and its recorded verification remain in the item above; browser reproduction is still unavailable because the dev server could not bind port 3000 (`EPERM`). Unit test remains skipped under `auto` because no test files/runner/script exist; integration/e2e remain off. Prior approval predates these corrections and is preserved.
- [x] Local browser follow-up: authenticated to the organizer scanner at `http://localhost:3002`, selected event loaded, and the scanner transitioned from REQUESTING to ACTIVE (“กำลังตรวจจับ QR”) without the update-depth loop; signed out afterward. No QR was scanned or submitted.
- [ ] Final review blocked — source and build checks support both fixes, and real camera startup is now observed. The result/acknowledgment/resume interaction still needs a synthetic invalid QR attempt in the local development app; authorization is pending because it would add one INVALID audit row. `src/components/organizer-scanner.tsx` is untracked at `HEAD`, so no committed pre-correction source diff is available; unrelated working-tree changes were excluded.
- [ ] If repository policy or explicit user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.
