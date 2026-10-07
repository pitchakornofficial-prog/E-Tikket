# TASK-016: Article Data Foundation & Category Management

- Status: done
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Establish the database schema for the News/Blog feature and provide Admin with category management. This foundation allows articles to be created and categorized in subsequent tasks.

Read:
- [CONTEXT.md](../../CONTEXT.md) (Article entities)
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md) (Domain data & Category rules)

## Blocked by

- None

## Todo

- [x] Update Prisma schema to include `ArticleStatus` enum, `ArticleCategory`, `ArticleTag`, `Article` models, and implicit many-to-many relations for `ArticleToTag` and `ArticleToEvent`.
- [x] Create and run Prisma migration for the new schema (`20261006181045_add_news_articles_and_categories`).
- [x] Implement Admin API routes for Category CRUD (`GET`, `POST`, `PUT`, `DELETE` at `/api/admin/categories` and `/api/admin/categories/[id]`).
- [x] Ensure category deletion is prevented with an explanatory error if articles are associated (AC-16).
- [x] Build the Admin UI for managing categories (list, create, edit, delete at `/admin/categories`).
- [x] Verify AC-15, AC-16 through database constraint verification script, seed testing, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Review approved: Schema, migrations, API routes with ADMIN auth, and category UI verified. AC-15 and AC-16 satisfied. Typecheck, lint, and build passed cleanly with no findings. Status transitioned to done.
