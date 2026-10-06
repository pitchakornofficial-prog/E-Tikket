# TASK-016: Article Data Foundation & Category Management

- Status: todo
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Establish the database schema for the News/Blog feature and provide Admin with category management. This foundation allows articles to be created and categorized in subsequent tasks.

Read:
- [CONTEXT.md](../../CONTEXT.md) (Article entities)
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md) (Domain data & Category rules)

## Blocked by

- None

## Todo

- [ ] Update Prisma schema to include `ArticleStatus` enum, `ArticleCategory`, `ArticleTag`, `Article` models, and implicit many-to-many relations for `ArticleToTag` and `ArticleToEvent`.
- [ ] Create and run Prisma migration for the new schema.
- [ ] Implement Admin API routes for Category CRUD (`GET`, `POST`, `PUT`, `DELETE` at `/api/admin/categories`).
- [ ] Ensure category deletion is prevented with an explanatory error if articles are associated (AC-16).
- [ ] Build the Admin UI for managing categories (list, create, edit, delete).
- [ ] Verify AC-15, AC-16 through API tests and manual UI testing.
- [ ] Commit the task-scoped changes.
