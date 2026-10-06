# ADR 0001: Core Architecture and Technology Stack for MVP

## Status
Accepted

## Date
2026-10-06

## Context
We need a robust, simple, and maintainable foundation for a small-scale concert/event ticketing platform (MVP). The system connects local event organizers with customers, handling ticket purchasing via bank transfer, slip upload, manual admin verification, secure QR ticket generation, mobile check-in with re-entry, and organizer/admin dashboards.

Key non-functional goals:
- Fast development cycle without overengineering (No microservices, no Redis, no complex queues).
- High security for tickets and QR codes (Cryptographic tokens, hash storage).
- Extensibility to plug in automated payment gateways later without rewriting ticket/check-in logic.
- Cost-effective and deployable on modern cloud/serverless platforms (e.g., Vercel + Cloudflare R2 + Supabase/Neon PostgreSQL).

## Decisions

### 1. Framework & Runtime: Next.js (App Router, TypeScript)
- **Decision:** Use Next.js with TypeScript and App Router as a Modular Monolith.
- **Rationale:** Unifies frontend and backend API endpoints/Server Actions in a single codebase, simplifying deployment, typing, and maintenance for a small team.

### 2. Styling: Tailwind CSS (High-Contrast Monochromatic / Black & White)
- **Decision:** Use Tailwind CSS with a clean, high-contrast black & white aesthetic.
- **Rationale:** Provides modern, professional, and atmospheric visuals suited for live music, concerts, and nightlife events while keeping design lightweight and responsive (mobile-first).

### 3. Database & ORM: PostgreSQL + Prisma ORM
- **Decision:** PostgreSQL with Prisma ORM.
- **Rationale:** Strong ACID guarantees for financial transactions (inventory locking, order state changes, and ticket issuance). Prisma provides type-safe migrations and schema management.

### 4. Storage: Cloudflare R2 (S3-Compatible)
- **Decision:** Store payment slip images and event banner images on Cloudflare R2 using AWS SDK (`@aws-sdk/client-s3`).
- **Rationale:** Zero egress fees, high availability, compatible with standard S3 SDKs, and solves ephemeral filesystem limitations on serverless hosts.

### 5. Authentication: Custom Session Cookie + bcrypt
- **Decision:** Lightweight HTTP-Only, Secure, SameSite cookie sessions for `ADMIN` and `ORGANIZER` roles.
- **Rationale:** Customers use guest checkout without passwords (viewing tickets via secure tokens). The system only requires auth for internal roles; a lightweight custom session avoids the boilerplate of external auth providers.

### 6. Ticket Security: CSPRNG Secret Token + SHA-256 Hashing
- **Decision:** Generate a 32-byte cryptographically secure random token for each ticket's QR code. Store only the SHA-256 hash (`qr_token_hash`) in the database.
- **Rationale:** Prevents ticket number enumeration and ticket forging. Even if the database is exposed, valid QR codes cannot be reconstructed.

### 7. Decoupled Payment Verification Boundary
- **Decision:** Order state transitions (`PENDING_PAYMENT` -> `WAITING_FOR_VERIFY` -> `PAID`) are decoupled from ticket generation. Ticket generation triggers strictly when an order enters `PAID`.
- **Rationale:** Allows future replacement of manual bank slip verification with automated payment gateways (e.g. PromptPay QR Bot, Stripe) with zero changes to Ticket or Check-in services.

## Consequences
- Single monolith simplifies deployment and observability.
- No customer authentication reduces checkout friction to near zero.
- Re-entry state machine (`OUTSIDE` <-> `INSIDE`) requires staff to choose Check-in vs Check-out on scanner.
