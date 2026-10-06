# TASK-004: Staff areas enforce authenticated access and role boundaries

- Status: todo
- Spec: [SPEC-001: Database & Authentication](../specs/SPEC-001-database-and-auth.md)

## Goal

Visitors are redirected to login before entering staff areas, ORGANIZER staff cannot enter the admin area, and valid staff reach their permitted destination (AC-06, AC-07). Read the owning spec's Route Protection Flow, role matrix, errors, and performance requirement, [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md), [CONTEXT.md](../../CONTEXT.md), [workflow](../workflow.md), and TASK-002's session boundary. Provide only minimal protected landing pages needed to observe authentication; dashboard metrics belong to Phase 8.

## Blocked by

- [TASK-002](TASK-002-staff-login-session.md)

## Todo

- [ ] Implement the specified Edge route guard in `src/middleware.ts`, reusing TASK-002's trusted session validation. Match both staff route roots and descendants; keep Node-only password/database code out of the Edge execution path.
- [ ] Redirect unauthenticated requests to `/admin`, `/organizer`, and their descendants to `/login?callbackUrl=...`; clear malformed, tampered, or expired session cookies before redirecting, as specified.
- [ ] Enforce the role matrix: ORGANIZER access to `/admin` and descendants is denied with 403 or redirected to `/organizer`; ADMIN can enter both staff areas. Redirect authenticated visitors away from `/login` to their role's landing page.
- [ ] Provide minimal `/admin` and `/organizer` authenticated destinations to demonstrate the permitted result. Implement a reusable server authorization boundary honoring 401 for unauthenticated API access and 403 for an Organizer attempting admin access; defer event ownership checks and business API endpoints to the phases that create those resources.
- [ ] Verify AC-06 and AC-07 by observing requests to route roots and representative descendants with no cookie, an Organizer cookie, and an Admin cookie; record redirect status/location or 403. Include tampered/expired cookies, cookie clearing, authenticated `/login` redirects, and checks of the server authorization boundary.
- [ ] Measure the Edge authentication validation against the spec's under-10ms requirement; record the measured operation, runtime/environment, and results. Do not substitute total browser/network response time for validation duration or assert the target without evidence.
- [ ] Apply `unit-test: auto` to meaningful role/route/session decisions and run supported typecheck/lint/build commands. Verify observable routing manually or with HTTP requests; do not add automated integration/e2e suites while they are off.
- [ ] Record implementation and verification evidence in this checklist and prepare the focused diff for the required `$code-review`; do not mark the task done before review requirements are satisfied.
- [ ] If repository policy or user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.
