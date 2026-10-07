# TASK-018: Organizer Article Workflow & Admin Approval

- Status: done
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Provide Organizers with an article management dashboard to create and submit articles for review, and enable Admins to approve or reject them.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-017

## Todo

- [x] Implement Organizer API routes for Article CRUD (`GET`, `POST`, `PUT`, `DELETE` at `/api/organizer/articles` and `[id]`), enforcing ownership (AC-20, AC-21).
- [x] Implement Organizer `/submit` API route to transition DRAFT to PENDING_REVIEW (AC-18).
- [x] Ensure Organizer updates to a PUBLISHED article automatically revert its status to PENDING_REVIEW (AC-19).
- [x] Build the Organizer Article List and Editor UI with Save Draft and Submit actions (`src/components/organizer-nav.tsx`, `/organizer/articles`, `/organizer/articles/new`, `/organizer/articles/[id]/edit`).
- [x] Implement Admin API routes for `/approve` and `/reject` (AC-11, AC-12).
- [x] Update Admin Article List UI to highlight `PENDING_REVIEW` articles and provide Approve/Reject actions (AC-10).
- [x] Verify AC-10 (Pending review identifiable), AC-11, AC-12, AC-17, AC-18, AC-19, AC-20, AC-21 via scratch verification script, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Review approved: Organizer article lifecycle, ownership boundaries, and admin review gates verified. Status transitioned to done.
