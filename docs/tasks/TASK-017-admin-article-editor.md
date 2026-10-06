# TASK-017: Admin Article Editor & Publishing Workflow

- Status: todo
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Enable Admins to create, edit, publish, unpublish, archive, and delete rich-text articles. This includes image uploads to Cloudflare R2 and enforcing unique article slugs.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-016

## Todo

- [ ] Implement image upload API (`/api/admin/articles/upload`) handling R2 storage, validating format (JPEG, PNG, WebP) and size (< 5MB) (AC-27, AC-28).
- [ ] Implement Admin API routes for Article CRUD and state transitions (`publish`, `unpublish`, `archive`). Ensure slug uniqueness validation (AC-22).
- [ ] Build the Admin Article Editor UI integrating a rich text editor (e.g., TipTap), cover image upload, event linking (searchable), and SEO metadata fields.
- [ ] Build the Admin Article List UI showing all articles with status badges and filters (AC-10 partial: listing all).
- [ ] Connect the Editor to the APIs so Admin can Save as Draft or Publish directly (AC-07, AC-08, AC-09, AC-13, AC-14).
- [ ] Verify AC-07, AC-08, AC-09, AC-10 (Admin list all), AC-13, AC-14, AC-22, AC-27, AC-28 through automated tests and manual UI usage.
- [ ] Commit the task-scoped changes.
