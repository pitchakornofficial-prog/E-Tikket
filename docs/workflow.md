# Workflow Conventions

Durable contract for development, tasks, and verification in this project.

## Development Lifecycle
```text
requirement (docs/requirement.md & docs/technical-spec.md)
    ↓
spec (docs/specs/SPEC-###-<feature>.md)
    ↓
task breakdown (docs/tasks/TASK-###-<slice>.md)
    ↓
implementation
    ↓
review & verification evidence
```

## Task States
- `todo`: Ready to be picked up
- `in_progress`: Currently being developed
- `in_review`: Implementation complete, undergoing verification/review
- `done`: Verified against acceptance criteria and approved
- `blocked`: Work cannot continue (must record blocker, reason, and unblock condition)

## MVP Implementation Phases
- **Phase 1:** Database + Authentication (Prisma models, seeds, Admin/Organizer auth)
- **Phase 2:** Event Management (Organizer CRUD, Event catalog, status draft/publish)
- **Phase 3:** Order + Checkout (Guest checkout, 15-min reservation timer, inventory lock)
- **Phase 4:** Slip Upload + Payment Verification (Cloudflare R2 upload, slip_hash duplicate check, Admin approve/reject)
- **Phase 5:** Ticket Generation + QR (CSPRNG 32-byte secret token, SHA-256 hash, QR rendering)
- **Phase 6:** Email Ticket (E-ticket delivery with QR codes and View My Tickets secure token)
- **Phase 7:** QR Check-in & Re-entry (Mobile web camera scanner, OUTSIDE <-> INSIDE state machine, audit log)
- **Phase 8:** Dashboard + Reports (Organizer event metrics, Admin platform overview & fee tracking)

## Workflow Rules
1. Every phase must be testable before proceeding to the next phase.
2. Changes must remain strictly within authorized scope.
3. Decoupled Payment Boundary must be respected.
4. Client-side input must never be trusted for payment or check-in verification.
