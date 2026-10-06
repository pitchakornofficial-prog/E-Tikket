# TASK-019: Public Article Listing & Discovery

- Status: todo
- Spec: [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Goal

Create the public `/news` page where visitors can discover published articles, complete with server-side rendering, pagination, category/tag filtering, and a navigation bar link.

Read:
- [docs/specs/SPEC-003-news-blog-seo.md](../../docs/specs/SPEC-003-news-blog-seo.md)

## Blocked by

- TASK-017

## Todo

- [ ] Add a "News" link to the main public navigation bar (AC-01).
- [ ] Implement the public API route `/api/articles` (or equivalent data fetching logic for SSR/ISR) returning only PUBLISHED articles, supporting reverse-chronological order and pagination.
- [ ] Support `?category=<slug>` and `?tag=<slug>` filtering in the data fetching logic.
- [ ] Build the `/news` page component rendering article cards (cover image, title, category, date, excerpt) (AC-02).
- [ ] Implement UI controls for category and tag filtering, updating the URL query parameters (AC-03, AC-04).
- [ ] Ensure clicking a tag on an article detail page (which will be built in TASK-020, but the link logic belongs here) navigates to `/news?tag=<slug>` (AC-30).
- [ ] Verify AC-01, AC-02, AC-03, AC-04, AC-30 via unit tests and manual browsing.
- [ ] Commit the task-scoped changes.
