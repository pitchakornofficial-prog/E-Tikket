# TASK-005: Staff can sign in and out through an accessible mobile login flow

- Status: todo
- Spec: [SPEC-001: Database & Authentication](../specs/SPEC-001-database-and-auth.md)

## Goal

Staff can use an accessible, responsive black-and-white login interface, see clear failure messages, reach their permitted staff area, and log out (AC-08 plus the spec's browser login/logout flows). Read the owning spec, [requirement UI/security rules](../requirement.md), [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md), [CONTEXT.md](../../CONTEXT.md), and [workflow](../workflow.md). The spec references no accepted login prototype; its behavior and monochrome direction are authoritative. API acceptance is owned by TASK-002/TASK-003 and route protection by TASK-004.

## Blocked by

- [TASK-003](TASK-003-staff-logout.md)
- [TASK-004](TASK-004-staff-route-protection.md)

## Todo

- [ ] Create `src/app/(auth)/login/page.tsx` with labeled email/password inputs, a submit action, accessible focus/error presentation, and responsive high-contrast black-and-white styling consistent with ADR-0001.
- [ ] Submit to TASK-002's login API; show "อีเมลหรือรหัสผ่านไม่ถูกต้อง" for invalid credentials and clear user-facing errors for validation/server failures. Keep credentials out of browser storage and logs.
- [ ] After successful login, route ADMIN to `/admin` and ORGANIZER to `/organizer`, preserving TASK-004's role restrictions and authenticated `/login` behavior. Do not add event management, dashboard metrics, customer registration, or password-recovery flows.
- [ ] Add a Logout control to the minimal staff landing UI, call TASK-003's logout API, and navigate to `/login` once logout succeeds. Verify the browser can no longer access protected pages/profile after logout.
- [ ] Verify AC-08 on mobile and desktop through visual and DOM inspection: monochrome palette, text/control contrast, associated labels, keyboard operation, visible focus, error readability, and absence of horizontal overflow. Record viewport sizes and observations.
- [ ] Observe the complete browser flow with seeded Admin and Organizer accounts: successful login to the correct destination, failed login retaining the form with a clear error, authenticated `/login` redirect, and logout followed by protected-page redirection. These observations supplement the existing API/guard checks; ownership of those criteria remains with the API and guard tasks above.
- [ ] Apply `unit-test: auto` only where meaningful task-owned UI logic warrants it, and run supported typecheck/lint/build commands. Do not create automated integration/e2e suites while those capabilities are off.
- [ ] Record implementation and verification evidence in this checklist and prepare the focused diff for the required `$code-review`; do not mark the task done before review requirements are satisfied.
- [ ] If repository policy or user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.
