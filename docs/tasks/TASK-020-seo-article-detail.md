# TASK-020: SEO Article Detail & Cross-Linking

- Status: todo
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Build the public article detail page (`/news/[slug]`) optimized for SEO with dynamic meta tags, rich text rendering, and bidirectional cross-linking between articles and events.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-017

## Todo

- [ ] Implement the data fetching logic for `/news/[slug]` ensuring it returns 404 for non-existent or non-PUBLISHED articles (AC-06).
- [ ] Build the `/news/[slug]` page component rendering full article content (sanitizing rich text against XSS), cover image, author, date, category, and tags (AC-05, AC-29).
- [ ] Implement dynamic SEO metadata generation in Next.js (`generateMetadata`), using custom SEO fields if present, or falling back to title/excerpt/cover image (AC-23, AC-24).
- [ ] Render actionable linked event cards on the article detail page if `article.events` exist (AC-25).
- [ ] Update the existing event detail page (`/events/[id]`) to fetch and display a "Related Articles" section containing cards for published articles linked to the event (AC-26).
- [ ] Verify AC-05, AC-06, AC-23, AC-24, AC-25, AC-26, AC-29 via automated tests and manual inspection of page source/meta tags.
- [ ] Commit the task-scoped changes.
