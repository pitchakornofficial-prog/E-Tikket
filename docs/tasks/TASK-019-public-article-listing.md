# TASK-019: Public Article Listing & Discovery

- Status: done
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Create the public `/news` page where visitors can discover published articles, complete with server-side rendering, pagination, category/tag filtering, and a navigation bar link.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-017

## Todo

- [x] Add a "News" link to the main public navigation bar (AC-01 in `src/components/public-navbar.tsx`).
- [x] Implement the public API route `/api/articles` returning only PUBLISHED articles in reverse-chronological order with pagination support.
- [x] Support `?category=<slug>` and `?tag=<slug>` filtering in data fetching logic.
- [x] Build the `/news` page component rendering article cards (cover image, title, category, date, excerpt) (AC-02 in `src/app/news/page.tsx`).
- [x] Implement UI controls for category and tag filtering, updating URL query parameters (AC-03, AC-04).
- [x] Ensure clicking a tag on an article navigates to `/news?tag=<slug>` (AC-30).
- [x] Verify AC-01, AC-02, AC-03, AC-04, AC-30 via scratch test script, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [x] Review approved: Public discovery, listing, filtering, pagination, and navbar integration verified. Status transitioned to done.
