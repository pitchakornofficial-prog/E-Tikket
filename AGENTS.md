# AGENTS.md

Entry point for AI agents working in this repository.

## Project Overview
Small MVP Event & Concert Ticketing Platform for local organizers (bars, restaurants, indie artists, campus events).
- Features: Event catalog, guest checkout (15-min reservation), bank transfer slip upload, admin payment verification, secure QR ticket generation (CSPRNG + SHA-256 hash), mobile check-in & re-entry (OUTSIDE <-> INSIDE), admin/organizer dashboards.
- Non-features (Strictly Out of Scope for MVP): No seat reservation/maps/zones, no customer accounts/passwords, no queue systems, no Redis, no microservices.

## Project Context Navigation
- **Product Requirements:** [docs/requirement.md](file:///d:/PROJECTs/PROJECT%20SSS/docs/requirement.md)
- **Technical Specification:** [docs/technical-spec.md](file:///d:/PROJECTs/PROJECT%20SSS/docs/technical-spec.md)
- **Domain Context:** [CONTEXT.md](file:///d:/PROJECTs/PROJECT%20SSS/CONTEXT.md)
- **Workflow Conventions:** [docs/workflow.md](file:///d:/PROJECTs/PROJECT%20SSS/docs/workflow.md)
- **Architecture Decisions:** [docs/adr/](file:///d:/PROJECTs/PROJECT%20SSS/docs/adr/)
- **Feature Specs:** `docs/specs/` (created when specifying features)
- **Task Slices:** `docs/tasks/` (created during task breakdown)

## Technology Stack
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS (Modern Monochromatic / High-Contrast Black & White aesthetic)
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Object Storage:** Cloudflare R2 (S3-compatible via `@aws-sdk/client-s3`)
- **Authentication:** Custom HTTP-Only Secure Cookie Session + bcrypt (Admin & Organizer only)
- **Email:** Hybrid (Console Log in Dev, SMTP/Resend in Prod)
- **QR Code:** `qrcode` library (DataURL/SVG generation)

## Standard Commands (Discovered / Target)
- Development Server: `npm run dev`
- Database Migration: `npx prisma migrate dev`
- Prisma Studio: `npx prisma studio`
- Type Check: `npm run typecheck` หรือ `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`

## Working Rules
- Strictly adhere to the MVP scope. Do not introduce unrequested features or overengineering.
- Maintain decoupled payment verification so automated payment gateways can be integrated in the future without altering Ticket & Check-in logic.
- Do not commit secrets (`.env` must remain in `.gitignore`).
- Wait for explicit user confirmation before writing implementation code.
