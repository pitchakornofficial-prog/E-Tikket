# TASK-018: Organizer Article Workflow & Admin Approval

- Status: todo
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Provide Organizers with an article management dashboard to create and submit articles for review, and enable Admins to approve or reject them.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-017

## Todo

- [ ] Implement Organizer API routes for Article CRUD (`GET`, `POST`, `PUT`, `DELETE` at `/api/organizer/articles`), enforcing ownership (AC-20, AC-21).
- [ ] Implement Organizer `/submit` API route to transition DRAFT to PENDING_REVIEW (AC-18).
- [ ] Ensure Organizer updates to a PUBLISHED article automatically revert its status to PENDING_REVIEW (AC-19).
- [ ] Build the Organizer Article List and Editor UI (reusing components from Admin where possible, but with Save Draft/Submit actions).
- [ ] Implement Admin API routes for `/approve` and `/reject` (AC-11, AC-12).
- [ ] Update Admin Article List UI to highlight `PENDING_REVIEW` articles and provide Approve/Reject actions (AC-10 partial: identifiable pending).
- [ ] Verify AC-10 (Pending review identifiable), AC-11, AC-12, AC-17, AC-18, AC-19, AC-20, AC-21 via tests and manual flows.
- [ ] Commit the task-scoped changes.
