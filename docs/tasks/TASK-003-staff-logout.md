# TASK-003: Staff can end their authenticated browser session

- Status: done
- Spec: [SPEC-001: Database & Authentication](../specs/SPEC-001-database-and-auth.md)

## Goal

An authenticated staff member can log out through the API, clearing their session cookie so subsequent profile requests from that browser are unauthorized (AC-05). Read the owning spec's Logout Flow and API contract, [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md), [CONTEXT.md](../../CONTEXT.md), [workflow](../workflow.md), and TASK-002's session boundary. TASK-005 owns the visible Logout control and navigation to `/login`.

## Blocked by

- [TASK-002](TASK-002-staff-login-session.md)

## Todo

- [x] Implement authenticated `POST /api/auth/logout` using TASK-002's session boundary; return 200 `{ success: true }` and invalidate the session cookie with an expired Set-Cookie header that matches the original cookie name, path, and relevant attributes. Created `src/app/api/auth/logout/route.ts` validating session via `getSession(request)`, returning 200 `{ success: true }`, and setting cookie with `Max-Age=0`, `Expires=Thu, 01 Jan 1970 00:00:00 GMT`, `Path=/`, `HttpOnly=true`, `SameSite=lax`. Unauthenticated requests return 401 `{ error: "Unauthorized" }` and clear invalid cookies if present.
- [x] Preserve the specified JSON API response; connect the browser's post-logout navigation in TASK-005 rather than replacing the API response with a page redirect.
- [x] Verify AC-05 with a browser or cookie jar: log in, confirm `/api/auth/me` returns 200, submit logout, apply the clearing Set-Cookie header, and confirm the next `/api/auth/me` returns 401. Inspect cookie expiry and ensure no authenticated browser session remains. Verified with seeded Admin credentials: login returned 200 with session cookie, `/api/auth/me` returned 200 with ADMIN role, `/api/auth/logout` returned 200 `{ success: true }` with expired `Set-Cookie`, subsequent `/api/auth/me` returned 401, and unauthenticated logout returned 401.
- [x] Apply `unit-test: auto` to meaningful task-owned logout/cookie logic and run supported typecheck/lint/build commands from the application manifest. Record the observable logout sequence without creating integration/e2e suites, which remain off. `npm run typecheck`, `npm run lint`, and `npm run build` passed cleanly. Unit-test `auto` skipped because no test runner script is installed in `package.json`; integration-test and e2e-test remain off per policy.
- [x] Record implementation and verification evidence in this checklist and prepare the focused diff for the required `$code-review`; do not mark the task done before review requirements are satisfied.
- [x] Review approved — `src/app/api/auth/logout/route.ts` against `HEAD`; AC-05 verified; `npm run typecheck`, `npm run lint`, and `npm run build` passed; no findings.
