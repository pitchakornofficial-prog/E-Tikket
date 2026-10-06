# SPEC-003: Task Map

- Spec: [SPEC-003-news-blog-seo.md](../specs/SPEC-003-news-blog-seo.md)

## Dependency Graph

```mermaid
flowchart TD
    T016["TASK-016: Article Data Foundation & Category Management"]
    T017["TASK-017: Admin Article Editor & Publishing Workflow"]
    T018["TASK-018: Organizer Article Workflow & Admin Approval"]
    T019["TASK-019: Public Article Listing & Discovery"]
    T020["TASK-020: SEO Article Detail & Cross-Linking"]

    T016 --> T017
    T017 --> T018
    T017 --> T019
    T017 --> T020
```

## Task List

- [ ] `TASK-016`: [Article Data Foundation & Category Management](TASK-016-article-data-and-categories.md)
- [ ] `TASK-017`: [Admin Article Editor & Publishing Workflow](TASK-017-admin-article-editor.md)
- [ ] `TASK-018`: [Organizer Article Workflow & Admin Approval](TASK-018-organizer-article-workflow.md)
- [ ] `TASK-019`: [Public Article Listing & Discovery](TASK-019-public-article-listing.md)
- [ ] `TASK-020`: [SEO Article Detail & Cross-Linking](TASK-020-seo-article-detail.md)
