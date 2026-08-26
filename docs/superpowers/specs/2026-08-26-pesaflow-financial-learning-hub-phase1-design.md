# PesaFlow Financial Learning Hub — Phase 1: Reader Core

**Date:** 2026-08-26
**Status:** Approved (design)
**Author:** Brainstormed with the team

---

## Context

PesaFlow is a React 19 + Vite SPA (wrapped in Capacitor for native mobile), using
Firebase (Firestore + Auth + Storage). Navigation is a **state machine** (`activeView`
in `App.tsx`), not URL-based — the whole app effectively lives at one URL, behind
`AuthGate`. The AI advisor is a **local rule-based engine** (`freeAdvisorAgent.ts`),
not an external LLM. A newsletter system and admin panel already exist.

We are adding a **Financial Learning Hub** (blog) to turn PesaFlow from a
money-management tool into a financial-education ecosystem: organic SEO traffic,
daily engagement, trust, community, and a funnel into the AI advisor and paid tools.

The full vision spans ~12 subsystems and **cannot be one spec**. It is decomposed
into phases; each phase gets its own spec → plan → build cycle:

| Phase | Scope |
|-------|-------|
| **1. Reader core (THIS SPEC)** | Blog nav item, Home (Editorial), Article page (Focused column), Firestore articles+categories schema & public read rules, Markdown+shortcode content model, share buttons, SEO-friendly URLs, client-side meta tags, empty states, dev seed |
| 2. Engagement | Working likes, nested comments (CRUD + comment likes) |
| 3. Admin CMS | Rich-text/Markdown editor, image upload, drafts/autosave, scheduling, category mgmt, comment moderation |
| 4. AI + Newsletter + Community | Wired "Ask PesaFlow AI" (reuse advisor), newsletter widget (reuse infra), profiles, reputation/badges, trending discussions |
| 5. SEO + bonus | Prerender/sitemap/schema, analytics dashboard, bookmarks, reading history, progress persistence, offline, recommendations, audio narration |

### Locked decisions (from brainstorming)

1. **URL strategy:** Add real routing via `react-router-dom`. Articles at `/blog/:slug`.
2. **Content source:** Firestore, **empty to start** (production). Dev seed for verification.
3. **Access model:** **Fully public read, gated actions.** Anyone (incl. crawlers) reads;
   like/comment/bookmark/Ask-AI prompt sign-up.
4. **Home direction:** **Editorial** — dark featured-story hero leads, then search,
   category pills, full-width latest feed.
5. **Article layout:** **Focused column** (Medium-style, ~720px), floating share bar
   (bottom sheet on mobile).
6. **Content model:** **Markdown + embed shortcodes** (`::calculator`, `::chart`,
   `::youtube`, `::table`).
7. **Brand:** PesaFlow gold/amber (`#D97706`) + Cormorant Garamond headings + DM Sans
   body. (The original brief said "green"; green remains the success accent only.)

---

## Goals (Phase 1)

- A **publicly readable** blog at `/blog` that renders articles from Firestore with
  rich Markdown + interactive shortcodes.
- **SEO-friendly, shareable URLs** (`/blog/:slug`) with per-article client-side meta
  tags (title, description, Open Graph, Twitter card).
- Editorial **Home** (featured hero, search, category pills, infinite-scroll feed) and
  Focused-column **Article** page (reading-progress bar, rich body, working share
  buttons, visible-but-deferred like/comment, Ask-AI funnel card).
- Firestore **schema, public-read security rules, and composite indexes**.
- **Polished empty states** for the empty production collection + a **dev-only seed
  script** to verify end-to-end.

### Non-goals (deferred by phase)

- Working like/comment persistence, comment threads — **Phase 2**.
- Admin CMS / article editor / image upload / scheduling — **Phase 3**.
- Wired Ask-AI, newsletter subscribe logic, profiles/badges, trending discussions — **Phase 4**.
- Prerender/sitemap/structured-schema (true crawler SEO), analytics dashboard,
  bookmarks, reading history persistence, offline, audio — **Phase 5**.

---

## Architecture

### Routing integration

Introduce `react-router-dom` and wrap the root in `<BrowserRouter>`. Split at the top
level in `App.tsx` (or a new `Root.tsx`):

- **`/blog`**, **`/blog/:slug`**, **`/blog/category/:categorySlug`** → new public
  `BlogApp`, rendered **outside** `AuthGate`. Reachable logged-out.
- **`/*` (all other paths)** → the **existing** state-machine app, unchanged, still
  wrapped by `AuthGate`.

**The existing app stays mounted at `/`** (NOT moved to `/app`). Rationale: moving the
base path risks breaking Google-auth redirect URIs and Firebase authorized-domain
config (see prior auth work). The blog lives alongside at `/blog`; no existing route
changes.

Deployment:
- **Vercel:** add a rewrite so all paths serve `index.html` (SPA fallback) — the app
  already deploys to Vercel; confirm `vercel.json`/framework SPA rewrite covers `/blog/*`.
- **Capacitor (native):** `BrowserRouter` works when the base is correct. If native
  build shows blank blog routes, fall back to `HashRouter` **for native only** via a
  build flag. Web keeps clean paths for SEO. (Verification step in plan.)

### Entry into the blog from the app

Add one nav entry ("Learn") to the existing `NAV_ITEMS` (`Header.tsx`) that links to
`/blog` (an anchor/navigate, not an `activeView`). Blog has its own lightweight top bar
(logo → `/blog`, categories, "Open PesaFlow" CTA → `/`).

---

## Data model (Firestore)

### `articles/{slug}`

The document **id is the slug** (the SEO URL segment), guaranteeing uniqueness and a
1:1 URL↔doc mapping.

```ts
interface Article {
  slug: string;                 // == doc id, e.g. "how-to-build-emergency-fund-kenya"
  title: string;
  excerpt: string;              // 1–2 sentence summary for cards + meta description fallback
  coverImageUrl: string;        // hero/cover
  categoryId: string;           // -> categories/{id}
  authorName: string;
  authorAvatarUrl: string;
  bodyMarkdown: string;         // Markdown + shortcodes
  status: 'draft' | 'scheduled' | 'published';
  featured: boolean;            // Editorial hero pick
  readMinutes: number;          // precomputed via readTime.ts
  publishedAt: Timestamp | null;
  scheduledFor: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  seo: {
    metaTitle: string;          // falls back to title
    metaDescription: string;    // falls back to excerpt
    ogImageUrl: string;         // falls back to coverImageUrl
    canonicalUrl?: string;
  };
  counts: {                     // denormalized; written by later phases, read now
    likes: number;
    comments: number;
    views: number;
  };
}
```

### `categories/{id}`

```ts
interface Category {
  id: string;                   // == doc id, e.g. "mmfs", "saccos", "budgeting"
  name: string;                 // "MMFs"
  slug: string;                 // "mmfs" (URL)
  description: string;
  order: number;                // pill display order
  colorToken: string;           // CSS token name for accent, e.g. "--gold"
}
```

Seed categories (Phase 1 fixed set): Budgeting, Saving, Investing, MMFs, SACCOs,
Chamas, Debt Management, Side Hustles, Daily Earners, Financial Literacy, Business
Finance, Retirement Planning.

### Content model: Markdown + shortcodes

`bodyMarkdown` is standard Markdown (headings, bold/italic, links, images, blockquotes,
bullet/numbered lists, tables) PLUS line-level **shortcodes**:

```
::calculator{type=emergency-fund}
::chart{data=mmf-growth}
::youtube{id=dQw4w9WgXcQ}
::table{src=...}          # optional; standard MD tables also supported
```

- The parser splits the body into an ordered list of **segments**: `{kind:'markdown', text}`
  or `{kind:'shortcode', name, attrs}`.
- Markdown segments render via a **small in-repo Markdown renderer** (no heavy dep;
  supports the block set above). Shortcode segments map to React components.
- **Unknown shortcodes degrade gracefully** — render nothing (or a subtle "unsupported
  embed" note in dev), never crash.
- Phase 1 ships these shortcode components: `Calculator` (emergency-fund variant only),
  `Chart` (simple bar chart from a named dataset), `YouTube` (privacy-nocookie iframe).
  More variants added in later phases.

---

## Security rules (`firestore.rules`)

```
match /articles/{slug} {
  allow read: if resource.data.status == 'published';
  allow write: if isAdmin();            // reuse existing admin-claim helper
}
match /categories/{id} {
  allow read: if true;
  allow write: if isAdmin();
}
```

- Drafts and scheduled articles are **invisible to the public** (read denied unless
  published). Admin tooling (Phase 3) reads all via admin claim.
- `isAdmin()` reuses the existing admin custom-claim / rule helper already used by the
  admin panel — do not invent a new mechanism; wire to the existing one.

### Composite indexes (`firestore.indexes.json`)

- `status (==) + publishedAt (desc)` — latest feed.
- `status (==) + featured (==) + publishedAt (desc)` — featured hero pick.
- `status (==) + categoryId (==) + publishedAt (desc)` — category feed.

---

## Component & module structure

```
src/components/blog/
  BlogApp.tsx              # <Routes> for /blog paths + <SEO> head mgmt + blog chrome
  BlogHome.tsx             # Editorial: FeaturedHero, search, CategoryPills, latest feed (infinite scroll)
  ArticlePage.tsx          # Focused column: ReadingProgress, header, MarkdownRenderer, ShareBar, AskAiCard, deferred engagement
  CategoryPage.tsx         # filtered feed for /blog/category/:slug
  parts/
    FeaturedHero.tsx       # dark hero band (reuses --ink/--gold-glow gradient)
    ArticleCard.tsx        # cover, category pill, title, excerpt, author, read time, counts
    CategoryPills.tsx      # sticky swipe carousel on mobile
    SearchBar.tsx          # client-side title/excerpt/category filter (Phase 1)
    ShareBar.tsx           # WhatsApp/FB/X/LinkedIn/Telegram/Copy — stateless, uses window URL
    AskAiCard.tsx          # dark funnel card; Phase 1 links to sign-up / advisor entry (wired P4)
    ReadingProgress.tsx    # scroll-driven top bar
    EngagementBar.tsx      # like/comment/bookmark buttons -> sign-up prompt (deferred)
    EmptyState.tsx         # polished empty feed / no-results
    BlogTopBar.tsx         # blog-specific header (logo, categories, "Open PesaFlow")
  content/
    MarkdownRenderer.tsx   # renders parsed markdown segments
    shortcodes/
      Calculator.tsx       # emergency-fund variant
      Chart.tsx            # bar chart from named dataset
      YouTube.tsx          # nocookie embed

src/hooks/
  useArticles.ts           # list published (feed, featured, by category), paginated
  useArticle.ts            # single by slug
  useCategories.ts         # list categories

src/lib/blog/
  slug.ts                  # title -> slug, collision handling
  markdown.ts              # parse body -> segments; render markdown blocks
  readTime.ts              # word count -> minutes
  seo.ts / useSEO.ts       # set document.title + meta/OG/Twitter tags per route

src/scripts/
  seedBlog.ts              # DEV ONLY: insert sample categories + 2 sample articles

src/types/index.ts         # add Article, Category, blog segment types
```

Files stay focused and independently testable. `markdown.ts`, `slug.ts`, `readTime.ts`
are pure and unit-tested. Data hooks wrap the existing `src/lib/firestore.ts` helpers
(`watchCollection`, `getDocument`, etc.) — no new Firestore access pattern.

---

## Public vs. gated behavior (Phase 1)

| Action | Phase 1 behavior |
|--------|------------------|
| Read Home / Article / Category | Public, no auth |
| Share (WhatsApp/FB/X/LinkedIn/Telegram/Copy link) | **Works** — stateless, needs only the URL |
| Search / filter by category | **Works** — client-side over loaded articles |
| Like / comment / bookmark | Button visible → **sign-up prompt** ("Create a free account to join in"). Persistence = Phase 2 |
| Ask PesaFlow AI | Card visible → routes to sign-up / advisor entry. Real wiring to `freeAdvisorAgent` = Phase 4 |

---

## SEO in Phase 1 (partial, honest)

`useSEO` sets `document.title`, `meta[name=description]`, Open Graph
(`og:title/description/image/url/type`), and Twitter card tags per route. This improves
link previews and title once JS executes. **True crawler ranking requires prerendering,
XML sitemap, and structured (Article) schema — deferred to Phase 5.** Phase 1 does not
claim Google ranking on its own.

---

## Responsive design

- **Mobile-first.** Article = single column, generous line-height. Share bar becomes a
  bottom sheet. Category pills = sticky horizontal swipe carousel. Feed = large cards.
- **Tablet:** two-column feed.
- **Desktop:** Editorial hero full-width; feed with generous max-width; (sidebar widgets
  are Phase 4 — Phase 1 keeps a clean full-width feed).
- Reuse existing tokens and `useBreakpoint` hook. Dark mode inherited from existing
  theme system (`ThemeContext`).

---

## Testing (vitest)

Match the existing suite style (`*.test.ts` beside source):

- `slug.test.ts` — title→slug (spaces, punctuation, Swahili chars, collisions).
- `markdown.test.ts` — parses headings/lists/tables/quotes; extracts shortcodes with
  attrs; **unknown shortcode → graceful fallback**; malformed shortcode doesn't crash.
- `readTime.test.ts` — word count → minutes rounding.
- `useArticles.test.ts` (or a pure query-builder unit) — filters to `status==published`,
  orders by `publishedAt desc`, picks a single `featured` correctly, category filter.

Manual verification: run `seedBlog.ts`, load `/blog`, open an article, share link,
filter categories, confirm empty state when collection cleared, confirm draft article
is not publicly readable.

---

## Risks & mitigations

- **Router base path breaking auth redirects** → keep existing app at `/`; only add
  `/blog`. Verify Google sign-in still works after `BrowserRouter` wrap.
- **Capacitor native + BrowserRouter** → verify on native; `HashRouter` fallback for
  native build only if needed (web stays path-based for SEO).
- **Empty production collection** → polished empty states; dev seed for verification.
- **Markdown renderer scope creep** → strictly limit Phase 1 block set; shortcodes cover
  the interactive needs; unknown input degrades gracefully.

---

## Deliverables (Phase 1)

1. `react-router-dom` added; root wrapped in `BrowserRouter`; `/blog/*` public routes
   outside `AuthGate`; existing app untouched at `/`.
2. Firestore `Article` + `Category` types; public-read security rules; composite indexes.
3. `BlogApp`, `BlogHome` (Editorial), `ArticlePage` (Focused column), `CategoryPage`,
   and the `parts/` + `content/` components listed above.
4. Data hooks (`useArticles`, `useArticle`, `useCategories`) over existing firestore lib.
5. `slug.ts`, `markdown.ts` (parser + renderer), `readTime.ts`, `useSEO` — with unit tests.
6. Working share buttons; visible-but-deferred like/comment/bookmark + Ask-AI funnel card.
7. Per-article client-side meta/OG/Twitter tags.
8. Polished empty states + dev-only `seedBlog.ts` (sample categories + 2 articles).
9. "Learn" nav entry linking the main app to `/blog`.
```
