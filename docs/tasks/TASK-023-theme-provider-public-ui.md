# TASK-023: Theme Provider & Public Pages UI

- Status: done
- Spec: [docs/specs/SPEC-005-dark-light-mode.md](../../docs/specs/SPEC-005-dark-light-mode.md)

## Goal

Establish the infrastructure for Dark/Light mode using a theme provider to prevent FOUC, detect system preferences, and persist user choices. Implement the theme toggle in the Public Navbar and apply light mode styling to all public-facing pages.

Read:
- [docs/specs/SPEC-005-dark-light-mode.md](../../docs/specs/SPEC-005-dark-light-mode.md)

## Blocked by

- None

## Todo

- [x] Install and configure a theme provider (e.g., `next-themes`) in the root layout to manage the `class` on the `<html>` element, preventing FOUC (AC-01, AC-02, AC-04).
- [x] Ensure Tailwind CSS is configured for `darkMode: 'class'`.
- [x] Create a reusable `ThemeToggle` UI component displaying a Sun icon (in dark mode) and Moon icon (in light mode).
- [x] Add the `ThemeToggle` to the shared Public Navbar. Ensure clicking it switches themes instantly (AC-03).
- [x] Update global styles and base layouts (e.g., `body`) to support `bg-white text-black` in light mode and `bg-black text-white` in dark mode.
- [x] Refactor all public pages (`/`, `/events/[id]`, `/checkout/[id]`, `/my-tickets`, `/tickets`, `/news`, etc.) to include appropriate `dark:` prefixes for existing dark styles, and base classes for light mode (e.g., `bg-neutral-50 dark:bg-neutral-950`).
- [x] Verify AC-01, AC-02, AC-03 (on Public Navbar), and AC-04 via manual browser testing.
- [x] If repository policy or user instructions require a commit, commit only the task-scoped changes; otherwise leave the focused diff for review.
