# TASK-030: Scanner Continuous Auto-Scan Fast Mode & Responsive Controls

- Status: done
- Spec: [docs/specs/SPEC-008-scanner-torch-haptic-continuous.md](../../docs/specs/SPEC-008-scanner-torch-haptic-continuous.md)

## Goal

Add Continuous Auto-Scan (Fast Mode) to the gate scanners so staff can scan high volumes of tickets at the door without tapping "สแกนคนถัดไป" each time. Provide a toggle switch, countdown progress bar, differentiated auto-reset delays (1.5s success, 2.5s warning), and manual button override.

Read:
- [docs/specs/SPEC-008-scanner-torch-haptic-continuous.md](../../docs/specs/SPEC-008-scanner-torch-haptic-continuous.md)
- `src/app/scanner/[token]/page.tsx`
- `src/components/organizer-scanner.tsx`

## Blocked by

- TASK-029

## Todo

- [x] Add Continuous Auto-Scan toggle switch with persistent preference in `src/app/scanner/[token]/page.tsx` and `src/components/organizer-scanner.tsx` (AC-06).
- [x] Implement auto-reset timer and animated countdown progress bar for scan feedback cards (1.5s for VALID, 2.5s for error/warning) (AC-06, AC-07).
- [x] Preserve immediate manual "สแกนคนถัดไป" action button to instantly clear feedback and resume scanning (AC-06, AC-08).
- [x] Verify Monochromatic Light and Dark mode appearance and run typecheck/build checks (AC-09).
