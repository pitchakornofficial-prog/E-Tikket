# TASK-024: Staff Dashboards & Semantic Components UI

- Status: done
- Spec: [docs/specs/SPEC-005-dark-light-mode.md](../../docs/specs/SPEC-005-dark-light-mode.md)

## Goal

Extend the Light Mode implementation to the Admin and Organizer dashboards. Ensure that semantic status badges (e.g., PAID, REJECTED) across the entire application maintain WCAG-compliant contrast ratios in both themes.

Read:
- [docs/specs/SPEC-005-dark-light-mode.md](../../docs/specs/SPEC-005-dark-light-mode.md)

## Blocked by

- TASK-023

## Todo

- [x] Add the `ThemeToggle` component to the Admin Dashboard Header and Organizer Dashboard Header (AC-03).
- [x] Refactor the login page (`/(auth)/login`) to support Light Mode classes.
- [x] Refactor all Admin pages (`/admin/*`) to support Light Mode, adjusting background, text, and border utilities.
- [x] Refactor all Organizer pages (`/organizer/*`, including the mobile scanner view) to support Light Mode.
- [x] Review and adjust all semantic status badges (Emerald, Amber, Red, Blue) across the application (Public and Staff) to ensure readability against light backgrounds (e.g., modifying `text-emerald-300` / `bg-emerald-950` to `text-emerald-700` / `bg-emerald-50` in light mode) (AC-06).
- [x] Verify AC-05 (consistent theme across Public, Organizer, Admin) and AC-06 via manual UI testing and accessibility contrast checks.
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
