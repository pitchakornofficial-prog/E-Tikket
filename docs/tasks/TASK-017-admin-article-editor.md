# TASK-017: Admin Article Editor & Publishing Workflow

- Status: done
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Enable Admins to create, edit, publish, unpublish, archive, and delete rich-text articles. This includes image uploads to Cloudflare R2 and enforcing unique article slugs.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-016

## Todo

- [x] Implement image upload API (`/api/admin/articles/upload`) handling storage, validating format (JPEG, PNG, WebP) and size (< 5MB) (AC-27, AC-28) and public image serving route (`/api/articles/images/[...key]`).
- [x] Implement Admin API routes for Article CRUD (`GET`, `POST`, `PUT`, `DELETE` at `/api/admin/articles` and `[id]`) and state transitions (`publish`, `unpublish`, `archive`, `approve`, `reject`). Enforce slug uniqueness validation (AC-22).
- [x] Build the Admin Article Editor UI integrating rich content editor, cover image upload, event linking (searchable), and SEO metadata fields (`src/components/article-editor.tsx`, `/admin/articles/new`, `/admin/articles/[id]/edit`).
- [x] Build the Admin Article List UI showing all articles with status badges and filters (AC-10 at `/admin/articles`).
- [x] Connect the Editor to the APIs so Admin can Save as Draft or Publish directly (AC-07, AC-08, AC-09, AC-13, AC-14).
- [x] Verify AC-07, AC-08, AC-09, AC-10 (Admin list all), AC-13, AC-14, AC-22, AC-27, AC-28 through automated tests, scratch script, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Review approved: Admin article editor and workflows verified. Status transitioned to done.
