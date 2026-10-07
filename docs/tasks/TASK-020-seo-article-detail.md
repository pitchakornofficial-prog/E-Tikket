# TASK-020: SEO Article Detail & Cross-Linking

- Status: done
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Build the public article detail page (`/news/[slug]`) optimized for SEO with dynamic meta tags, rich text rendering, and bidirectional cross-linking between articles and events.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-017

## Todo

- [x] Implement the data fetching logic for `/news/[slug]` and `/api/articles/[slug]` ensuring 404 for non-existent or non-PUBLISHED articles (AC-06).
- [x] Build the `/news/[slug]` page component rendering full article content, cover image, author, date, category, tags, and sanitized markup against XSS (AC-05, AC-29 in `src/app/news/[slug]/page.tsx`).
- [x] Implement dynamic SEO metadata generation in Next.js (`generateMetadata`), using custom SEO fields if present, or falling back to title/excerpt/cover image (AC-23, AC-24).
- [x] Render actionable linked event cards on the article detail page if `article.events` exist (AC-25).
- [x] Update the existing event detail page (`/events/[id]`) to fetch and display a "Related Articles" section containing cards for published articles linked to the event (AC-26 in `src/app/events/[id]/page.tsx`).
- [x] Verify AC-05, AC-06, AC-23, AC-24, AC-25, AC-26, AC-29 via scratch test script, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Review approved: SEO article detail, dynamic Open Graph metadata, safe rendering, and bidirectional event cross-linking verified. Status transitioned to done.
