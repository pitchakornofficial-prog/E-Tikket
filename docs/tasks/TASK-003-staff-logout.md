# TASK-003: Staff can end their authenticated browser session

- Status: todo
- Spec: [SPEC-001: Database & Authentication](../specs/SPEC-001-database-and-auth.md)

## Goal

An authenticated staff member can log out through the API, clearing their session cookie so subsequent profile requests from that browser are unauthorized (AC-05). Read the owning spec's Logout Flow and API contract, [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md), [CONTEXT.md](../../CONTEXT.md), [workflow](../workflow.md), and TASK-002's session boundary. TASK-005 owns the visible Logout control and navigation to `/login`.

## Blocked by

- [TASK-002](TASK-002-staff-login-session.md)

## Todo

- [ ] Implement authenticated `POST /api/auth/logout` using TASK-002's session boundary; return 200 `{ success: true }` and invalidate the session cookie with an expired Set-Cookie header that matches the original cookie name, path, and relevant attributes.
- [ ] Preserve the specified JSON API response; connect the browser's post-logout navigation in TASK-005 rather than replacing the API response with a page redirect.
- [ ] Verify AC-05 with a browser or cookie jar: log in, confirm `/api/auth/me` returns 200, submit logout, apply the clearing Set-Cookie header, and confirm the next `/api/auth/me` returns 401. Inspect cookie expiry and ensure no authenticated browser session remains.
- [ ] Apply `unit-test: auto` to meaningful task-owned logout/cookie logic and run supported typecheck/lint/build commands from the application manifest. Record the observable logout sequence without creating integration/e2e suites, which remain off.
- [ ] Record implementation and verification evidence in this checklist and prepare the focused diff for the required `$code-review`; do not mark the task done before review requirements are satisfied.
- [ ] If repository policy or user instructions require a commit, commit only task-scoped changes; otherwise leave the focused diff for review.
