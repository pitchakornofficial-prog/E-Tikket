# SPEC-005: Dark / Light Mode

- Status: ready
- Requirement: [docs/requirement.md — Confirmed Dark / Light Mode Decisions](../requirement.md#confirmed-dark--light-mode-decisions)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: None

## Problem and outcome

Currently, the E-Tikket platform is strictly locked into a dark mode UI. While this aligns with the high-contrast aesthetic, it reduces accessibility and readability for users operating in bright environments or those who prefer light interfaces.

Completing this feature produces:
1. Full light mode styling across the entire platform, inverting the monochromatic design to feature white/light backgrounds and black/dark text.
2. An automatic initial theme based on the user's operating system preferences, falling back to dark mode.
3. A theme toggle button (Sun/Moon icon) accessible in the global Navbar across Public, Admin, and Organizer pages.
4. Persistent theme state saved in the user's browser, preventing a flash of unstyled content (FOUC) on subsequent visits.

## In scope

- Tailwind CSS configuration for `class`-based dark mode support (if not already set).
- Theme provider integration (e.g., using `next-themes` to manage state and FOUC).
- A theme toggle UI component in the shared Public Navbar, Admin Header, and Organizer Header.
- Implementation of light mode specific classes (e.g., `bg-white`, `text-black`, `border-neutral-200`) across all existing UI components.
- Adjustment of semantic status colors (Emerald, Amber, Red, Blue) to ensure accessible contrast ratios against light backgrounds.

## Out of scope

- Saving the theme preference to the user's profile in the database.
- Complete rebranding or introduction of new primary brand colors (we maintain the strict monochromatic baseline).
- User-customizable accent colors or complex theme builders.

## User flow and behavior

1. **Initial Visit**: A visitor opens any page on the platform. The application checks the OS-level system preference (`prefers-color-scheme`). 
    - If OS is Light -> Site renders Light mode.
    - If OS is Dark (or unavailable) -> Site renders Dark mode.
2. **Toggling Theme**: The visitor sees a Sun (if in dark mode) or Moon (if in light mode) icon in the navigation bar. Upon clicking the icon, the application immediately switches the theme.
3. **Persistence**: The selected theme is stored in the browser (LocalStorage or Cookie). 
4. **Returning Visit**: When the user returns to the site or refreshes the page, the application reads the saved preference and renders the correct theme immediately without flashing the default theme.

## Business rules and constraints

1. **Global application**: The theme toggle must be available and functional across all user boundaries (Public, Organizer, Admin).
2. **Design Integrity**: The light mode must strictly adhere to a high-contrast, minimalist aesthetic. Backgrounds should generally be solid white (`bg-white`) or very light gray (`bg-neutral-50`), with text being solid black (`text-black`) or dark gray (`text-neutral-800`).
3. **FOUC Prevention**: The implementation must guarantee no "Flash of Unstyled Content" where the site briefly loads in the wrong theme before hydrating.

## Data and permissions

### Domain data
No database schema changes are required.

### Client state
- LocalStorage / Cookie key: Typically `theme` (values: `system`, `dark`, `light`).

### Permissions
All users (Public guests, authenticated Organizers, authenticated Admins) have full permission to change their local theme.

## Errors and edge cases

1. **Disabled LocalStorage / Cookies**: If the user's browser blocks local storage, the application should gracefully fall back to the system preference on every load, without throwing unhandled JS errors when the toggle is clicked.
2. **Contrast on dynamically generated content**: Text overlapping user-uploaded event images (if any) must maintain readability in both modes (e.g., using backdrop-blur, text-shadow, or semi-transparent overlays).

## Interfaces and observable test points

### UI states

- **Navbar Toggle**: Displays `SunIcon` when in dark mode, `MoonIcon` when in light mode.
- **Backgrounds**: Dark mode = `bg-black` / `bg-neutral-950`. Light mode = `bg-white` / `bg-neutral-50`.
- **Text**: Dark mode = `text-white` / `text-neutral-400`. Light mode = `text-black` / `text-neutral-600`.
- **Borders**: Dark mode = `border-neutral-800`. Light mode = `border-neutral-200`.
- **Semantic Badges**: Ensure contrast. E.g., PAID status badge background/text adjustments so it doesn't look washed out on white backgrounds.

## Non-functional requirements

### Accessibility
- Contrast ratios must meet WCAG AA standards (4.5:1 for normal text) in both themes.
- The toggle button must have an accessible `aria-label` (e.g., "Toggle theme").

### Performance
- The script that prevents FOUC must be tiny, inline, and blocking only long enough to set the `<html>` or `<body>` class before the main render tree paints.

## Acceptance criteria

- AC-01: Given a first-time visitor with a Light mode OS preference, when they open the site, then the site loads directly in Light mode.
- AC-02: Given a first-time visitor with a Dark mode OS preference, when they open the site, then the site loads directly in Dark mode.
- AC-03: Given any user, when they click the theme toggle in the navigation bar, then the interface immediately switches to the opposite theme.
- AC-04: Given a user who has manually toggled the theme, when they refresh the page or open a new tab, then their chosen theme loads immediately without flashing the other theme (No FOUC).
- AC-05: Given any user, when they navigate between Public pages, Organizer dashboard, and Admin dashboard, then the chosen theme is applied consistently across all areas.
- AC-06: Given a Light mode interface, when semantic status badges (e.g., PAID/emerald, WAITING/amber, REJECTED/red) are displayed, then their text maintains a WCAG-compliant contrast ratio against their badge background.

## Verification plan

| AC | Verification |
| --- | --- |
| AC-01 | Manual: Set OS to Light mode, open in Incognito. Verify background is white. |
| AC-02 | Manual: Set OS to Dark mode, open in Incognito. Verify background is black. |
| AC-03 | UI interaction test: Click the theme toggle and assert HTML class changes between `dark` and `light` (or equivalent). |
| AC-04 | Manual: Set theme to Light (on Dark OS), refresh the page. Verify no black background flashes during hydration. |
| AC-05 | Manual: Navigate from `/` (Public) to `/login` to `/admin` and confirm the UI remains in the selected theme. |
| AC-06 | Accessibility check: Run Lighthouse or axe-core on a page containing all status badges in light mode to confirm contrast ratios pass. |

## Open questions

- **Non-blocking**: The exact library used for theme management (e.g., `next-themes`). This is standard practice in Next.js apps and can be confidently chosen during implementation.
