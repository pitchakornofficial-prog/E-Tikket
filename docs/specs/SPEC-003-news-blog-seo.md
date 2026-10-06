# SPEC-003: News / Blog Content for SEO

- Status: ready
- Requirement: [docs/requirement.md — Confirmed News/Blog Feature Decisions](../requirement.md#confirmed-news--blog-feature-decisions)
- Context: [CONTEXT.md — Article entities and rules 14–16](../../CONTEXT.md)
- ADRs: [ADR-0001](../adr/0001-core-architecture-and-tech-stack.md)

## Problem and outcome

The platform has no content pages beyond event listings. Search engines cannot discover TICKETBOX through topical queries about local events, concerts, or the music scene. A news/blog feature adds indexable, keyword-rich pages that attract organic traffic and funnel visitors toward event purchase.

Completing this feature produces:

1. A public article listing page at `/news` linked from the main navigation bar.
2. Public SEO-optimized article detail pages at `/news/[slug]`.
3. An Admin article management interface: create, edit, publish, unpublish, archive, and delete any article; manage article categories.
4. An Organizer article management interface: create and edit own articles, submit for review; cannot publish directly.
5. Bidirectional linking between articles and events.
6. Category and tag classification for content organization and SEO.
7. Per-article editable SEO metadata (title, description, OG image) with auto-generated fallbacks.

## In scope

- Article CRUD for Admin (full) and Organizer (own articles, requires approval).
- Article status lifecycle: `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `ARCHIVED`.
- Article category management by Admin (CRUD).
- Free-form article tags with autocomplete from existing tags.
- Article–Event linking (many-to-many).
- Rich text content editing (headings, bold, italic, inline images, links).
- Cover image upload to R2.
- Inline image upload to R2 within the rich text editor.
- Editable SEO metadata per article: SEO title, meta description, OG image.
- Auto-generated SEO metadata fallbacks from article title, first paragraph, and cover image.
- Public `/news` listing page with category and tag filtering.
- Public `/news/[slug]` article detail page with server-side rendering for SEO.
- Related event cards on article detail pages.
- Related articles on event detail pages.
- Navigation bar link to `/news`.

## Out of scope

- Comment system on articles.
- Social media sharing buttons beyond standard OG meta tags.
- Article analytics or view counts.
- RSS/Atom feed.
- Scheduled publishing (publish at future date).
- Full-text search across articles (browser-level category/tag filtering is in scope).
- Article versioning or revision history.
- Organizer managing categories or tags in a dedicated management interface (Organizer only uses tags inline while writing).

## User flow and behavior

### Client — reading articles

1. Visitor navigates to `/news` from the main navigation bar or a direct link.
2. The listing page shows published articles in reverse-chronological order with cover image, title, category, date, and a short excerpt.
3. Visitor can filter articles by category or tag using URL query parameters (e.g., `/news?category=reviews`, `/news?tag=indie`).
4. Visitor clicks an article card to open `/news/[slug]`.
5. The detail page renders the full rich text content, cover image, author name, publication date, category, tags, and linked event cards.
6. If linked events exist, they appear as actionable cards (image, name, date, venue, price) that navigate to the event detail page.
7. The page includes proper `<title>`, `<meta name="description">`, and Open Graph tags derived from the article's SEO fields or their auto-generated fallbacks.

### Client — event detail page (cross-link)

1. On an existing event detail page (`/events/[id]`), if published articles reference this event, a "Related Articles" section appears showing article cards.

### Admin — article management

1. Admin navigates to the article management section in the Admin dashboard.
2. Admin sees a list of all articles with title, author, status, category, and date. The list can be filtered by status.
3. Admin can create a new article: fills in title, slug (auto-generated, editable), category (required, select from existing), tags (optional, free-form with autocomplete), cover image (optional), rich text content, linked events (optional, searchable select), and SEO fields (optional).
4. Admin can save as Draft, or Publish directly.
5. Admin can edit any article regardless of author. Editing a published Admin-authored article keeps it Published.
6. Admin can unpublish (Published → Draft), archive (Published/Draft → Archived), or delete any article.
7. Admin sees articles with status `PENDING_REVIEW` prominently (e.g., filtered view or badge count) and can Approve (→ Published) or Reject (→ Draft) them.

### Admin — category management

1. Admin accesses category management from the article management section.
2. Admin can create a new category with a name and slug.
3. Admin can edit or delete existing categories. Deleting a category that has articles requires reassignment or confirmation.

### Organizer — article management

1. Organizer navigates to the article management section in the Organizer dashboard.
2. Organizer sees only their own articles with title, status, category, and date.
3. Organizer can create a new article with the same fields as Admin.
4. Organizer saves as Draft, then explicitly submits for review (Draft → Pending Review).
5. Organizer cannot publish directly.
6. When Admin rejects, the article returns to Draft. Organizer can edit and resubmit.
7. When Organizer edits a Published article, the status automatically changes to Pending Review. The previous published version is no longer visible to the public until re-approved.
8. Organizer can delete their own Draft or Rejected articles. Organizer cannot delete Published or Pending Review articles (must request Admin).

## Business rules and constraints

1. **Article approval gate:** Organizer articles must pass Admin approval before becoming publicly visible. Admin articles bypass this gate. ([CONTEXT.md rule 14](../../CONTEXT.md))
2. **Organizer edit reverts review:** Editing a Published Organizer article automatically reverts its status to Pending Review, making it temporarily invisible to the public until re-approved. ([CONTEXT.md rule 15](../../CONTEXT.md))
3. **Admin superuser:** Admin can edit, delete, unpublish, and archive any article regardless of authorship. ([CONTEXT.md rule 16](../../CONTEXT.md))
4. **Slug uniqueness:** Each article slug must be unique across the system. The system must reject duplicate slugs at creation and edit time.
5. **Category required:** Every article must belong to exactly one category.
6. **Tags optional and free-form:** Tags are optional. New tags are created implicitly when used. The editor provides autocomplete suggestions from existing tags.
7. **Event linking optional and many-to-many:** An article can link to zero or more events. An event can be linked from zero or more articles. Only Published events should be selectable for linking.
8. **Cover image optional:** Articles without a cover image display a default placeholder on listing and detail pages.
9. **Content type:** Article content is stored as the rich text editor's native format (e.g., TipTap JSON) and rendered to HTML for the public page.
10. **Image storage:** Cover images and inline rich text images are stored in Cloudflare R2 using the existing storage infrastructure. Article images are publicly readable (unlike QR artifacts).

## Data and permissions

### Domain data

- **Article:** id, title, slug (unique), content (rich text JSON), excerpt (auto-generated or manual), coverImageUrl, seoTitle, seoDescription, ogImageUrl, status (ArticleStatus enum), authorId (→ User), categoryId (→ ArticleCategory), publishedAt, createdAt, updatedAt.
- **ArticleCategory:** id, name, slug (unique), createdAt, updatedAt.
- **ArticleTag:** id, name, slug (unique), createdAt.
- **ArticleTagRelation:** articleId, tagId (many-to-many join).
- **ArticleEventRelation:** articleId, eventId (many-to-many join).

### Article status enum

`DRAFT` | `PENDING_REVIEW` | `PUBLISHED` | `ARCHIVED`

### Permissions

| Action | Admin | Organizer | Public |
| --- | --- | --- | --- |
| Create article | ✅ | ✅ (own) | ❌ |
| Edit article | ✅ (any) | ✅ (own, reverts Published to Pending Review) | ❌ |
| Publish directly | ✅ | ❌ | ❌ |
| Submit for review | N/A | ✅ (own Draft → Pending Review) | ❌ |
| Approve / Reject | ✅ | ❌ | ❌ |
| Delete article | ✅ (any) | ✅ (own Draft only) | ❌ |
| Unpublish / Archive | ✅ (any) | ❌ | ❌ |
| Manage categories | ✅ | ❌ | ❌ |
| Read published articles | ✅ | ✅ | ✅ |
| Read all articles (any status) | ✅ | ❌ (own only) | ❌ |

### State transitions

```
Admin flow:
  DRAFT → PUBLISHED (direct publish)
  DRAFT → ARCHIVED
  PUBLISHED → DRAFT (unpublish)
  PUBLISHED → ARCHIVED
  ARCHIVED → DRAFT

Organizer flow:
  DRAFT → PENDING_REVIEW (submit for review)
  PENDING_REVIEW → PUBLISHED (Admin approves)
  PENDING_REVIEW → DRAFT (Admin rejects)
  PUBLISHED → PENDING_REVIEW (Organizer edits, automatic)

Either actor:
  Any status → deleted (Admin deletes any; Organizer deletes own DRAFT only)
```

## Errors and edge cases

1. **Duplicate slug:** When creating or editing an article, if the slug already exists, return a validation error prompting the user to change the slug.
2. **Category deletion with articles:** When Admin attempts to delete a category that has associated articles, the system should prevent deletion and display a message explaining the articles must be reassigned first.
3. **Event unlinking on Event deletion:** If an event linked to articles is deleted, the article–event association is removed. The article remains intact.
4. **Organizer edits Published article:** Status automatically changes to Pending Review. The article becomes invisible on the public site until re-approved. The system should warn the Organizer before saving.
5. **Empty content:** An article cannot be published (or submitted for review) with empty title or empty content.
6. **Image upload failure:** If cover image or inline image upload to R2 fails, display an error in the editor. Do not save the article with a broken image reference.
7. **Tag cleanup:** Tags that are no longer associated with any article may remain in the database for autocomplete. No automatic cleanup is required.
8. **Unauthorized access:** Organizer attempting to access or modify another Organizer's articles receives a 403 Forbidden response.

## Interfaces and observable test points

### Public pages (SSR for SEO)

| Route | Behavior |
| --- | --- |
| `GET /news` | Server-rendered listing of published articles, reverse chronological. Supports `?category=<slug>` and `?tag=<slug>` query filters. Paginated. |
| `GET /news/[slug]` | Server-rendered article detail. Returns 404 for non-existent or non-published articles. Includes SEO meta tags, structured data, and linked event cards. |

### Admin API routes

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/admin/articles` | GET | List all articles with optional status filter. Auth: Admin. |
| `/api/admin/articles` | POST | Create article. Auth: Admin. |
| `/api/admin/articles/[id]` | GET | Get article detail for editing. Auth: Admin. |
| `/api/admin/articles/[id]` | PUT | Update article. Auth: Admin. |
| `/api/admin/articles/[id]` | DELETE | Delete article. Auth: Admin. |
| `/api/admin/articles/[id]/publish` | POST | Publish article directly. Auth: Admin. |
| `/api/admin/articles/[id]/unpublish` | POST | Unpublish article (Published → Draft). Auth: Admin. |
| `/api/admin/articles/[id]/archive` | POST | Archive article. Auth: Admin. |
| `/api/admin/articles/[id]/approve` | POST | Approve Organizer article (Pending Review → Published). Auth: Admin. |
| `/api/admin/articles/[id]/reject` | POST | Reject Organizer article (Pending Review → Draft). Auth: Admin. |
| `/api/admin/categories` | GET | List all categories. Auth: Admin. |
| `/api/admin/categories` | POST | Create category. Auth: Admin. |
| `/api/admin/categories/[id]` | PUT | Update category. Auth: Admin. |
| `/api/admin/categories/[id]` | DELETE | Delete category (fails if articles exist). Auth: Admin. |

### Organizer API routes

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/organizer/articles` | GET | List own articles. Auth: Organizer. |
| `/api/organizer/articles` | POST | Create article. Auth: Organizer. |
| `/api/organizer/articles/[id]` | GET | Get own article detail. Auth: Organizer (own only). |
| `/api/organizer/articles/[id]` | PUT | Update own article. Auth: Organizer (own only). Reverts Published → Pending Review. |
| `/api/organizer/articles/[id]` | DELETE | Delete own Draft article. Auth: Organizer (own Draft only). |
| `/api/organizer/articles/[id]/submit` | POST | Submit for review (Draft → Pending Review). Auth: Organizer (own only). |

### Public API routes

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/articles` | GET | List published articles. Supports `?category=<slug>`, `?tag=<slug>`, pagination. Public. |
| `/api/articles/[slug]` | GET | Get published article by slug. Returns 404 for non-published. Public. |

### Image upload

| Route | Method | Behavior |
| --- | --- | --- |
| `/api/admin/articles/upload` | POST | Upload article image (cover or inline) to R2. Auth: Admin. Returns public URL. |
| `/api/organizer/articles/upload` | POST | Upload article image to R2. Auth: Organizer. Returns public URL. |

### UI states

- **Article listing (public):** Loading, empty state (no articles), article cards, category/tag active filter indicator, pagination controls.
- **Article detail (public):** Full content render, linked event cards (or none), 404 page for invalid slug.
- **Admin article list:** All articles with status badges, filter by status tabs (All / Draft / Pending Review / Published / Archived), pending review count badge.
- **Admin article editor:** Title, slug (auto-generated with edit), category select, tag input with autocomplete, cover image upload, rich text editor, event linker (searchable), SEO fields section (collapsible), save/publish/submit actions.
- **Admin category manager:** Category list with edit/delete, create form.
- **Organizer article list:** Own articles only, status badges, create button.
- **Organizer article editor:** Same as Admin editor but with "Save Draft" and "Submit for Review" actions instead of "Publish".

## Non-functional requirements

### SEO

- Article detail pages must be server-side rendered (SSR or SSG with ISR) to ensure search engine crawlability.
- Each article page must include: canonical URL, `<title>` (from seoTitle or article title), `<meta name="description">` (from seoDescription or excerpt), Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type=article`).
- Article listing page must be crawlable and paginated with proper `rel="next"` / `rel="prev"` or equivalent.
- Article slugs must be URL-safe, lowercase, hyphenated.
- Semantic HTML (`<article>`, `<h1>`, `<time>`, `<nav>`) for article content.

### Accessibility

- All images must have alt text. Cover images use article title as fallback alt.
- Rich text content must render with proper heading hierarchy.
- Navigation, forms, and interactive elements must be keyboard accessible.

### Security

- All article management API routes require authentication (Admin or Organizer session).
- Organizer can only access own articles; server must verify ownership on every request.
- Rich text content must be sanitized on render to prevent XSS from stored content.
- Image uploads must validate file type (JPEG, PNG, WebP) and size limit (5 MB) server-side.

### Performance

- Public article pages should leverage Next.js caching strategies (ISR or on-demand revalidation) appropriate for content that changes infrequently.

## Acceptance criteria

- AC-01: Given a visitor on any page, when they look at the navigation bar, then a "News" link is visible and navigates to `/news`.
- AC-02: Given published articles exist, when a visitor opens `/news`, then the page renders a list of published articles in reverse-chronological order with cover image, title, category, date, and excerpt.
- AC-03: Given published articles exist, when a visitor filters by category via `?category=<slug>`, then only articles in that category are shown.
- AC-04: Given published articles exist, when a visitor filters by tag via `?tag=<slug>`, then only articles with that tag are shown.
- AC-05: Given a published article, when a visitor opens `/news/[slug]`, then the page renders the full article content, author name, date, category, tags, and linked event cards with correct SEO meta tags.
- AC-06: Given a non-existent or non-published slug, when a visitor opens `/news/[slug]`, then a 404 page is returned.
- AC-07: Given an authenticated Admin, when they create an article with title, content, and category and choose "Publish", then the article status is `PUBLISHED` and it is immediately visible on `/news`.
- AC-08: Given an authenticated Admin, when they create an article and choose "Save Draft", then the article status is `DRAFT` and it is not visible on `/news`.
- AC-09: Given an authenticated Admin, when they edit any published article (including Organizer's) and save, then the article remains `PUBLISHED` with updated content.
- AC-10: Given an authenticated Admin, when they view the article list, then all articles from all authors are visible with status indicators, and articles with `PENDING_REVIEW` status are identifiable.
- AC-11: Given an authenticated Admin, when they approve a `PENDING_REVIEW` article, then the article status changes to `PUBLISHED` and it becomes visible on `/news`.
- AC-12: Given an authenticated Admin, when they reject a `PENDING_REVIEW` article, then the article status changes to `DRAFT` and it is not visible on `/news`.
- AC-13: Given an authenticated Admin, when they unpublish a `PUBLISHED` article, then the status changes to `DRAFT` and it is no longer visible on `/news`.
- AC-14: Given an authenticated Admin, when they delete any article, then the article is removed from the system.
- AC-15: Given an authenticated Admin, when they create a category with a name and slug, then the category is available for article assignment.
- AC-16: Given an authenticated Admin, when they attempt to delete a category that has associated articles, then the deletion is prevented with an explanatory error message.
- AC-17: Given an authenticated Organizer, when they create an article with title, content, and category and choose "Save Draft", then the article status is `DRAFT` and visible only to that Organizer and Admin.
- AC-18: Given an authenticated Organizer, when they submit a Draft article for review, then the article status changes to `PENDING_REVIEW`.
- AC-19: Given an authenticated Organizer, when they edit their own `PUBLISHED` article and save, then the article status automatically changes to `PENDING_REVIEW` and is no longer visible on `/news` until re-approved.
- AC-20: Given an authenticated Organizer, when they attempt to edit or view another Organizer's article, then they receive a 403 Forbidden response.
- AC-21: Given an authenticated Organizer, when they attempt to delete a non-Draft article, then the deletion is prevented.
- AC-22: Given an article being created, when the auto-generated slug conflicts with an existing slug, then a validation error is shown and the user must provide a unique slug.
- AC-23: Given an article without custom SEO fields, when the article is published and rendered, then the page `<title>` falls back to the article title, `<meta description>` falls back to the first paragraph excerpt, and `og:image` falls back to the cover image.
- AC-24: Given an article with custom SEO fields, when the article is published and rendered, then the custom SEO title, description, and OG image are used in the page metadata.
- AC-25: Given an article linked to one or more published events, when a visitor views the article, then actionable event cards are displayed linking to those events.
- AC-26: Given an event linked from one or more published articles, when a visitor views the event detail page, then a "Related Articles" section displays those article cards.
- AC-27: Given Admin or Organizer uploading an article image, when the file is a valid JPEG, PNG, or WebP under 5 MB, then the image is stored in R2 and its public URL is returned.
- AC-28: Given Admin or Organizer uploading an article image, when the file exceeds 5 MB or is an invalid type, then the upload is rejected with a validation error.
- AC-29: Given a rich text article with inline images and formatting, when rendered on the public page, then all formatting is preserved and content is sanitized against XSS.
- AC-30: Given an article with tags, when the visitor clicks a tag on the article detail page, then they are navigated to `/news?tag=<slug>` showing filtered results.

## Verification plan

| AC | Verification |
| --- | --- |
| AC-01 | Manual: inspect navigation bar on public pages for "News" link and verify it navigates to `/news`. |
| AC-02 | Unit test: article listing API returns published articles in reverse-chronological order. Manual: verify rendering. |
| AC-03 | Unit test: article listing API with `category` filter returns only matching articles. |
| AC-04 | Unit test: article listing API with `tag` filter returns only matching articles. |
| AC-05 | Unit test: article detail API returns full article data for valid published slug. Manual: verify rendered output and HTML meta tags. |
| AC-06 | Unit test: article detail API returns 404 for non-existent or non-published slug. |
| AC-07 | Unit test: Admin create-and-publish API sets status to PUBLISHED. |
| AC-08 | Unit test: Admin create-as-draft API sets status to DRAFT; public listing API excludes it. |
| AC-09 | Unit test: Admin update on any published article keeps status PUBLISHED. |
| AC-10 | Unit test: Admin list API returns articles from all authors with status field. |
| AC-11 | Unit test: Admin approve API transitions PENDING_REVIEW → PUBLISHED and sets publishedAt. |
| AC-12 | Unit test: Admin reject API transitions PENDING_REVIEW → DRAFT. |
| AC-13 | Unit test: Admin unpublish API transitions PUBLISHED → DRAFT. |
| AC-14 | Unit test: Admin delete API removes article from database. |
| AC-15 | Unit test: Admin create category API persists category. |
| AC-16 | Unit test: Admin delete category API returns error when articles exist in that category. |
| AC-17 | Unit test: Organizer create API sets status DRAFT; public listing excludes it. |
| AC-18 | Unit test: Organizer submit API transitions DRAFT → PENDING_REVIEW. |
| AC-19 | Unit test: Organizer update on own PUBLISHED article transitions to PENDING_REVIEW. |
| AC-20 | Unit test: Organizer access to another Organizer's article returns 403. |
| AC-21 | Unit test: Organizer delete on non-DRAFT article returns error. |
| AC-22 | Unit test: create/update article with duplicate slug returns validation error. |
| AC-23 | Unit test: article detail API without custom SEO fields returns fallback values from title, content, and cover image. |
| AC-24 | Unit test: article detail API with custom SEO fields returns those values. |
| AC-25 | Manual: verify event cards appear on article detail page for linked events. Unit test: article detail API includes linked event data. |
| AC-26 | Manual: verify "Related Articles" section on event detail page. Unit test: event detail API or page includes linked articles. |
| AC-27 | Unit test: image upload API accepts valid file and returns URL. |
| AC-28 | Unit test: image upload API rejects oversized or invalid-type files. |
| AC-29 | Manual: verify rich text rendering and confirm no executable scripts in stored content. |
| AC-30 | Manual: verify tag click navigates to filtered listing. |

## Open questions

- **Non-blocking:** Exact pagination strategy (numbered pages vs. cursor-based vs. load-more button) — can be decided during task planning.
- **Non-blocking:** Maximum number of related articles shown on the event detail page — can be decided during implementation (3–5 is typical).
- **Non-blocking:** Rich text editor library final selection — TipTap is recommended and assumed; can be confirmed during implementation.
- **Non-blocking:** Whether article excerpt is auto-generated from first N characters of content or manually editable — can be decided during implementation (auto-generated with optional override is typical).
