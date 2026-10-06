# SPEC-001: Database & Authentication (Phase 1)

- Status: ready
- Requirement: [docs/requirement.md](../requirement.md)
- Context: [CONTEXT.md](../../CONTEXT.md)
- ADRs: [docs/adr/0001-core-architecture-and-tech-stack.md](../adr/0001-core-architecture-and-tech-stack.md)
- Technical Spec: [docs/technical-spec.md](../technical-spec.md)

## Problem and outcome

To support all event ticketing operations, the platform requires a centralized, type-safe relational data model (PostgreSQL + Prisma) and a secure, low-overhead authentication and authorization system for staff roles (`ADMIN` and `ORGANIZER`).

Completing this feature produces:
1. Complete Prisma schema representing `User`, `Event`, `Order`, `Payment`, `Ticket`, and `TicketScan`.
2. Initial seed script generating preconfigured Admin and Organizer credentials.
3. Custom HTTP-Only cookie session management and password hashing with bcrypt/Argon2.
4. Protected API endpoints (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) and Next.js Route Guard Middleware restricting `/admin/*` and `/organizer/*` pages.
5. Responsive, high-contrast black & white Login interface for staff.

## In scope

- Prisma schema definition with relations, constraints, indexes, and enums (`Role`, `EventStatus`, `OrderStatus`, `PaymentStatus`, `TicketStatus`, `ScanAction`).
- Database migration setup and seed script (`prisma/seed.ts`).
- Auth helper utilities (`src/lib/auth.ts`): password hashing, password comparison, session cookie creation, session validation.
- Auth API endpoints:
  - `POST /api/auth/login` (validates email & password, issues HTTP-only session cookie)
  - `POST /api/auth/logout` (clears session cookie)
  - `GET /api/auth/me` (returns current authenticated user profile)
- Edge Middleware (`src/middleware.ts`):
  - Redirects unauthenticated requests to `/admin/*` and `/organizer/*` to `/login`.
  - Enforces role boundaries: `ORGANIZER` cannot access `/admin/*`.
- Staff Login page (`src/app/(auth)/login/page.tsx`) adhering to the high-contrast black & white aesthetic.

## Out of scope

- Customer accounts, customer password management, or registration (Customers use guest checkout and tokenized access per MVP rules).
- OAuth / Social login (Google, Facebook, etc.).
- Multi-factor authentication (MFA / 2FA).
- Event CRUD or ticket purchasing logic (owned by Phase 2 and Phase 3).

## User flow and behavior

### 1. Staff Login Flow
1. User navigates to `/login`.
2. User submits email and password.
3. System verifies credentials against the `users` table:
   - If invalid: Displays error "อีเมลหรือรหัสผ่านไม่ถูกต้อง" without revealing which field was wrong.
   - If valid: Issues an HTTP-Only, Secure, SameSite session cookie containing user ID and role, then redirects:
     - `ADMIN` role → redirects to `/admin`
     - `ORGANIZER` role → redirects to `/organizer`

### 2. Route Protection Flow
1. Unauthenticated request to `/admin` or `/organizer` → Middleware redirects to `/login?callbackUrl=...`.
2. Authenticated `ORGANIZER` accessing `/admin` → Middleware redirects to `/organizer` or displays 403 Forbidden.
3. Authenticated user accessing `/login` → Automatically redirected to their corresponding dashboard.

### 3. Logout Flow
1. Staff clicks "Logout" button.
2. Client invokes `POST /api/auth/logout`.
3. Server clears the session cookie and redirects user to `/login`.

## Business rules and constraints

1. **Internal Roles Only:** Only users with `ADMIN` or `ORGANIZER` roles exist in the `users` table.
2. **Password Security:** Passwords must be hashed using bcrypt (cost factor >= 10) or Argon2id. Plaintext passwords must never be logged or stored.
3. **Cookie Security:** Session cookies must have `HttpOnly = true`, `SameSite = 'lax'`, `Path = '/'`, and `Secure = true` in production.
4. **Decoupled Customer Access:** No customer sessions or tokens use this cookie session engine.

## Data and permissions

### Role Matrix
| Role | Access to `/admin/*` | Access to `/organizer/*` | Access to `/api/admin/*` | Access to `/api/organizer/*` |
|---|---|---|---|---|
| Unauthenticated | No (redirect to `/login`) | No (redirect to `/login`) | 401 Unauthorized | 401 Unauthorized |
| `ORGANIZER` | No (403 Forbidden) | Yes | 403 Forbidden | Yes (own events only) |
| `ADMIN` | Yes | Yes (oversight) | Yes | Yes |

### User Model Summary
- `id`: Unique string ID (cuid)
- `email`: Unique string, validated email format
- `passwordHash`: Hashed string
- `name`: Display name
- `role`: Enum `ADMIN` | `ORGANIZER`
- `createdAt`, `updatedAt`: Timestamps

## Errors and edge cases

1. **Invalid Credentials:** Return 401 Unauthorized with generic error message.
2. **Malformed JSON Payload:** Return 400 Bad Request with validation errors.
3. **Database Disconnection during Auth:** Return 500 Internal Server Error with user-friendly error message.
4. **Tampered / Expired Session Cookie:** Middleware clears invalid cookie and redirects to `/login`.

## Interfaces and observable test points

- `POST /api/auth/login`
  - Input: `{ "email": "admin@example.com", "password": "SecretPassword123" }`
  - Success Response: 200 OK `{ "user": { "id": "...", "email": "...", "name": "...", "role": "ADMIN" } }` + `Set-Cookie` header
- `POST /api/auth/logout`
  - Success Response: 200 OK `{ "success": true }` + Expired `Set-Cookie` header
- `GET /api/auth/me`
  - Success Response: 200 OK `{ "user": { "id": "...", "email": "...", "name": "...", "role": "..." } }`
  - Unauthenticated Response: 401 Unauthorized `{ "error": "Unauthorized" }`

## Non-functional requirements

- **Security:** Protection against brute-force, timing attacks on password verification, and XSS extraction of tokens via HTTP-Only cookies.
- **Performance:** Auth verification in Edge Middleware must execute in under 10ms.
- **Aesthetics:** Minimalist, high-contrast black & white design for `/login` matching the project design theme.

## Acceptance criteria

- **AC-01:** Given a PostgreSQL database and Prisma schema, when `npx prisma migrate dev` and `npx prisma db seed` are executed, then the database tables (`users`, `events`, `orders`, `payments`, `tickets`, `ticket_scans`) are created and seeded with default Admin and Organizer accounts.
- **AC-02:** Given valid Admin credentials, when submitting `POST /api/auth/login`, then the response status is 200, an HTTP-Only session cookie is set, and user details (excluding password hash) are returned.
- **AC-03:** Given invalid credentials, when submitting `POST /api/auth/login`, then the response status is 401 and no session cookie is issued.
- **AC-04:** Given an active session cookie, when calling `GET /api/auth/me`, then the user profile and role are returned with status 200.
- **AC-05:** Given an active session, when submitting `POST /api/auth/logout`, then the session cookie is invalidated and subsequent calls to `GET /api/auth/me` return 401.
- **AC-06:** Given an unauthenticated visitor, when navigating to `/admin` or `/organizer`, then the request is intercepted by middleware and redirected to `/login`.
- **AC-07:** Given an authenticated user with role `ORGANIZER`, when navigating to `/admin`, then the request is rejected with 403 Forbidden or redirected away from the admin area.
- **AC-08:** Given the login page at `/login`, when viewed on mobile or desktop, then the interface renders a high-contrast black & white aesthetic with accessible inputs and clear error states.

## Verification plan

| AC | Verification Approach |
| --- | --- |
| AC-01 | Run Prisma CLI migration & seed commands; verify tables and seeded records using Prisma Client or query script. |
| AC-02 | Test `POST /api/auth/login` with seeded Admin credentials; assert 200 status, `Set-Cookie` header attributes (HttpOnly, Path, SameSite), and response body. |
| AC-03 | Test `POST /api/auth/login` with incorrect password; assert 401 status and absence of session cookie. |
| AC-04 | Send authenticated request with cookie to `GET /api/auth/me`; assert 200 status and matching user payload. |
| AC-05 | Send `POST /api/auth/logout` followed by `GET /api/auth/me`; assert cookie is cleared and me endpoint returns 401. |
| AC-06 | Make GET request to `/admin` without cookie; assert 307/308 redirect to `/login`. |
| AC-07 | Make GET request to `/admin` with `ORGANIZER` session cookie; assert access denied (403 or redirect to `/organizer`). |
| AC-08 | Visual and DOM inspection of `/login` verifying monochrome color palette, contrast ratio, and responsive layout. |

## Open questions

- Non-blocking: Session expiration window is set to 7 days by default with sliding renewal on active usage.
