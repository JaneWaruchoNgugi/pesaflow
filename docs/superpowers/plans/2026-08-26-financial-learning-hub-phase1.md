# Financial Learning Hub — Phase 1 (Reader Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a publicly readable Financial Learning Hub at `/blog` — Editorial home, Focused-column article pages rendering Markdown + interactive shortcodes, backed by Firestore with public-read rules, SEO-friendly shareable URLs, working share buttons, deferred engagement affordances, polished empty states, and a dev seed.

**Architecture:** Introduce `react-router-dom` at the root (`main.tsx`) and split traffic: `/blog/*` renders a new public `BlogApp` (outside the existing `AuthGate`), everything else renders the existing `App` unchanged at `/`. Blog data lives in top-level Firestore collections `articles/{slug}` and `categories/{id}`, read via a dedicated query module (not the user-scoped `sync.ts` path). Article bodies are Markdown + line-level shortcodes parsed into ordered segments and rendered by an in-repo renderer + React shortcode components.

**Tech Stack:** React 19, TypeScript, Vite 7, Vitest 4, Firebase 12 (Firestore), react-router-dom 7, lucide-react. Inline-style components using existing CSS variables (`--gold`, `--ink`, Cormorant Garamond / DM Sans), matching the `GuestBanner.tsx` style convention.

**Spec:** `docs/superpowers/specs/2026-08-26-pesaflow-financial-learning-hub-phase1-design.md`

---

## File Structure

**Create:**
- `src/components/blog/BlogApp.tsx` — routes + SEO + blog chrome
- `src/components/blog/BlogHome.tsx` — Editorial home
- `src/components/blog/ArticlePage.tsx` — Focused-column reader
- `src/components/blog/CategoryPage.tsx` — filtered feed
- `src/components/blog/parts/BlogTopBar.tsx`
- `src/components/blog/parts/FeaturedHero.tsx`
- `src/components/blog/parts/ArticleCard.tsx`
- `src/components/blog/parts/CategoryPills.tsx`
- `src/components/blog/parts/SearchBar.tsx`
- `src/components/blog/parts/ShareBar.tsx`
- `src/components/blog/parts/ReadingProgress.tsx`
- `src/components/blog/parts/AskAiCard.tsx`
- `src/components/blog/parts/EngagementBar.tsx`
- `src/components/blog/parts/SignUpPrompt.tsx`
- `src/components/blog/parts/EmptyState.tsx`
- `src/components/blog/content/MarkdownRenderer.tsx`
- `src/components/blog/content/shortcodes/Calculator.tsx`
- `src/components/blog/content/shortcodes/Chart.tsx`
- `src/components/blog/content/shortcodes/YouTube.tsx`
- `src/lib/blog/slug.ts` (+ `slug.test.ts`)
- `src/lib/blog/readTime.ts` (+ `readTime.test.ts`)
- `src/lib/blog/markdown.ts` (+ `markdown.test.ts`)
- `src/lib/blog/articleSelectors.ts` (+ `articleSelectors.test.ts`)
- `src/lib/blog/seo.ts` (+ `seo.test.ts`)
- `src/lib/blog/articlesRepo.ts` — Firestore queries
- `src/lib/blog/categoriesRepo.ts` — Firestore queries
- `src/hooks/useArticles.ts`, `src/hooks/useArticle.ts`, `src/hooks/useCategories.ts`
- `src/scripts/seedBlog.ts` — dev-only seed

**Modify:**
- `src/main.tsx` — wrap in `BrowserRouter` + top-level `Routes`
- `src/types/index.ts` — add `Article`, `Category`, `ContentSegment`, `BlogFeedPage`
- `src/components/Header.tsx` — add "Learn" link to `/blog`
- `firestore.rules` — add `articles` + `categories`
- `firestore.indexes.json` — add blog composite indexes
- `package.json` — `react-router-dom` dependency (via install)

---

## Task 0: Install router and split routes at the root

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/main.tsx`
- Create: `src/components/blog/BlogApp.tsx` (temporary placeholder, fleshed out in Task 14)

- [ ] **Step 1: Install react-router-dom**

Run:
```bash
npm install react-router-dom@^7
```
Expected: `package.json` gains `"react-router-dom": "^7.x"` under dependencies; no errors.

- [ ] **Step 2: Create a placeholder BlogApp so the route resolves**

Create `src/components/blog/BlogApp.tsx`:
```tsx
import React from 'react';

// Placeholder — replaced with real routes in Task 14.
export const BlogApp: React.FC = () => (
  <div style={{ padding: 40, fontFamily: 'DM Sans, sans-serif' }}>
    <h1 style={{ fontFamily: 'Cormorant Garamond, serif' }}>Financial Learning Hub</h1>
    <p>Coming together…</p>
  </div>
);
```

- [ ] **Step 3: Wrap the root in BrowserRouter and split routes**

Edit `src/main.tsx`. Replace the `createRoot(...).render(...)` block so the render tree is:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { BlogApp } from './components/blog/BlogApp.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { seedDemoIfNeeded } from './lib/demoData'

try { seedDemoIfNeeded(); } catch { /* non-fatal: empty app still works */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public blog — rendered OUTSIDE the app's AuthGate */}
          <Route path="/blog/*" element={<BlogApp />} />
          {/* Existing app — unchanged, stays at root to protect Google-auth redirects */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
```
Keep the existing service-worker unregister block below unchanged.

- [ ] **Step 4: Verify both routes load and auth is unaffected**

Run:
```bash
npm run dev
```
Then manually confirm:
- `http://localhost:5173/` → existing app loads (landing/app as before).
- `http://localhost:5173/blog` → placeholder "Financial Learning Hub" renders.
- Google sign-in on `/` still completes (popup flow untouched).

- [ ] **Step 5: Verify production build passes**

Run:
```bash
npm run build
```
Expected: `tsc -b && vite build` completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/components/blog/BlogApp.tsx
git commit -m "feat(blog): add router split — /blog public, app stays at /"
```

---

## Task 1: Add blog types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append blog types**

Add to the end of `src/types/index.ts`:
```ts
// ─── Blog / Financial Learning Hub ─────────────────────────

export type ArticleStatus = 'draft' | 'scheduled' | 'published';

export interface ArticleSEO {
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl?: string;
}

export interface ArticleCounts {
  likes: number;
  comments: number;
  views: number;
}

export interface Article {
  slug: string;                 // == Firestore doc id
  title: string;
  excerpt: string;
  coverImageUrl: string;
  categoryId: string;
  authorName: string;
  authorAvatarUrl: string;
  bodyMarkdown: string;
  status: ArticleStatus;
  featured: boolean;
  readMinutes: number;
  publishedAt: string | null;   // ISO string
  scheduledFor: string | null;  // ISO string
  createdAt: string;            // ISO string
  updatedAt: string;            // ISO string
  seo: ArticleSEO;
  counts: ArticleCounts;
}

export interface Category {
  id: string;                   // == Firestore doc id, e.g. "mmfs"
  name: string;
  slug: string;
  description: string;
  order: number;
  colorToken: string;           // CSS var name, e.g. "--gold"
}

// Parsed article body: an ordered list of markdown blocks and shortcodes.
export type ContentSegment =
  | { kind: 'markdown'; text: string }
  | { kind: 'shortcode'; name: string; attrs: Record<string, string> };

// One page of the paginated feed. `cursor` is opaque (a Firestore doc id) used to
// fetch the next page; null when there are no more pages.
export interface BlogFeedPage {
  articles: Article[];
  cursor: string | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(blog): add Article, Category, ContentSegment types"
```

---

## Task 2: Slug utility (TDD)

**Files:**
- Create: `src/lib/blog/slug.ts`
- Test: `src/lib/blog/slug.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/blog/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { slugify, ensureUniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('How To Save Money')).toBe('how-to-save-money');
  });
  it('strips punctuation', () => {
    expect(slugify('SACCO vs. MMF: Which?')).toBe('sacco-vs-mmf-which');
  });
  it('collapses and trims separators', () => {
    expect(slugify('  Best   MMF — 2026  ')).toBe('best-mmf-2026');
  });
  it('keeps digits', () => {
    expect(slugify('Top 7 side hustles')).toBe('top-7-side-hustles');
  });
  it('returns empty string for empty input', () => {
    expect(slugify('   ')).toBe('');
  });
});

describe('ensureUniqueSlug', () => {
  it('returns the base slug when unused', () => {
    expect(ensureUniqueSlug('save-money', new Set())).toBe('save-money');
  });
  it('appends -2 on first collision', () => {
    expect(ensureUniqueSlug('save-money', new Set(['save-money']))).toBe('save-money-2');
  });
  it('increments until free', () => {
    const taken = new Set(['save-money', 'save-money-2', 'save-money-3']);
    expect(ensureUniqueSlug('save-money', taken)).toBe('save-money-4');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/blog/slug.test.ts`
Expected: FAIL — cannot find module `./slug`.

- [ ] **Step 3: Implement**

Create `src/lib/blog/slug.ts`:
```ts
/** Convert a title into a URL-safe slug. */
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (combining diacritical marks)
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens

/** Given a base slug and the set of already-taken slugs, return a free variant. */
export const ensureUniqueSlug = (base: string, taken: Set<string>): string => {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/blog/slug.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/slug.ts src/lib/blog/slug.test.ts
git commit -m "feat(blog): add slugify + ensureUniqueSlug"
```

---

## Task 3: Read-time utility (TDD)

**Files:**
- Create: `src/lib/blog/readTime.ts`
- Test: `src/lib/blog/readTime.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/blog/readTime.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readMinutes } from './readTime';

describe('readMinutes', () => {
  it('returns at least 1 for short text', () => {
    expect(readMinutes('a few short words here')).toBe(1);
  });
  it('rounds up based on ~200 wpm', () => {
    const words = Array.from({ length: 400 }, () => 'word').join(' ');
    expect(readMinutes(words)).toBe(2);
  });
  it('ignores shortcode/markdown noise reasonably', () => {
    const body = '## Heading\n\n' + Array.from({ length: 600 }, () => 'save').join(' ');
    expect(readMinutes(body)).toBe(3);
  });
  it('returns 1 for empty', () => {
    expect(readMinutes('')).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/blog/readTime.test.ts`
Expected: FAIL — cannot find module `./readTime`.

- [ ] **Step 3: Implement**

Create `src/lib/blog/readTime.ts`:
```ts
const WORDS_PER_MINUTE = 200;

/** Estimate reading time in whole minutes (minimum 1). */
export const readMinutes = (body: string): number => {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/blog/readTime.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/readTime.ts src/lib/blog/readTime.test.ts
git commit -m "feat(blog): add readMinutes estimator"
```

---

## Task 4: Markdown + shortcode parser (TDD)

**Files:**
- Create: `src/lib/blog/markdown.ts`
- Test: `src/lib/blog/markdown.test.ts`

This task ONLY parses the body into `ContentSegment[]` (splitting shortcode lines out from Markdown) and parses shortcode attributes. Rendering Markdown to HTML happens in Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/lib/blog/markdown.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseSegments, parseShortcode } from './markdown';

describe('parseShortcode', () => {
  it('parses name and attrs', () => {
    expect(parseShortcode('::calculator{type=emergency-fund}')).toEqual({
      kind: 'shortcode', name: 'calculator', attrs: { type: 'emergency-fund' },
    });
  });
  it('parses multiple attrs and quoted values', () => {
    expect(parseShortcode('::youtube{id=abc123 title="Save now"}')).toEqual({
      kind: 'shortcode', name: 'youtube', attrs: { id: 'abc123', title: 'Save now' },
    });
  });
  it('parses a shortcode with no attrs', () => {
    expect(parseShortcode('::divider')).toEqual({
      kind: 'shortcode', name: 'divider', attrs: {},
    });
  });
  it('returns null for a non-shortcode line', () => {
    expect(parseShortcode('## Just a heading')).toBeNull();
  });
});

describe('parseSegments', () => {
  it('keeps a plain markdown body as one segment', () => {
    const md = '## Title\n\nSome **bold** text.';
    expect(parseSegments(md)).toEqual([{ kind: 'markdown', text: md }]);
  });
  it('splits shortcodes out of surrounding markdown', () => {
    const md = 'Intro para.\n\n::calculator{type=emergency-fund}\n\nOutro para.';
    const segs = parseSegments(md);
    expect(segs).toEqual([
      { kind: 'markdown', text: 'Intro para.' },
      { kind: 'shortcode', name: 'calculator', attrs: { type: 'emergency-fund' } },
      { kind: 'markdown', text: 'Outro para.' },
    ]);
  });
  it('handles consecutive shortcodes', () => {
    const md = '::chart{data=mmf}\n::youtube{id=x}';
    expect(parseSegments(md)).toEqual([
      { kind: 'shortcode', name: 'chart', attrs: { data: 'mmf' } },
      { kind: 'shortcode', name: 'youtube', attrs: { id: 'x' } },
    ]);
  });
  it('ignores blank input', () => {
    expect(parseSegments('   ')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/blog/markdown.test.ts`
Expected: FAIL — cannot find module `./markdown`.

- [ ] **Step 3: Implement**

Create `src/lib/blog/markdown.ts`:
```ts
import type { ContentSegment } from '../../types';

const SHORTCODE_RE = /^::([a-z][a-z0-9-]*)(?:\{(.*)\})?\s*$/i;

/** Parse a shortcode attribute string: `type=emergency-fund title="Save now"`. */
const parseAttrs = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const re = /([a-z0-9_-]+)=(?:"([^"]*)"|(\S+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  return attrs;
};

/** Parse a single line into a shortcode segment, or null if it isn't one. */
export const parseShortcode = (line: string): Extract<ContentSegment, { kind: 'shortcode' }> | null => {
  const m = line.trim().match(SHORTCODE_RE);
  if (!m) return null;
  return { kind: 'shortcode', name: m[1].toLowerCase(), attrs: parseAttrs(m[2] ?? '') };
};

/**
 * Split an article body into ordered segments. Any line that is a standalone
 * shortcode becomes its own segment; runs of other lines are grouped into
 * markdown segments (trimmed, blank groups dropped).
 */
export const parseSegments = (body: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) segments.push({ kind: 'markdown', text });
    buffer = [];
  };

  for (const line of body.split('\n')) {
    const shortcode = parseShortcode(line);
    if (shortcode) {
      flush();
      segments.push(shortcode);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return segments;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/blog/markdown.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/markdown.ts src/lib/blog/markdown.test.ts
git commit -m "feat(blog): parse article body into markdown + shortcode segments"
```

---

## Task 5: Markdown block renderer

**Files:**
- Create: `src/lib/blog/mdToHtml.ts`
- Test: `src/lib/blog/mdToHtml.test.ts`
- Create: `src/components/blog/content/MarkdownRenderer.tsx`

We render a limited, safe Markdown block set (headings, bold/italic, links, inline code, blockquotes, unordered/ordered lists, tables, images, paragraphs, horizontal rules). We escape HTML first to avoid injection, then apply formatting.

- [ ] **Step 1: Write the failing test for the HTML converter**

Create `src/lib/blog/mdToHtml.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mdToHtml } from './mdToHtml';

describe('mdToHtml', () => {
  it('renders headings', () => {
    expect(mdToHtml('## Save money')).toContain('<h2>Save money</h2>');
  });
  it('renders bold and italic', () => {
    expect(mdToHtml('**bold** and *italic*'))
      .toContain('<strong>bold</strong> and <em>italic</em>');
  });
  it('renders links', () => {
    expect(mdToHtml('[MMF](https://x.com)'))
      .toContain('<a href="https://x.com" target="_blank" rel="noopener noreferrer">MMF</a>');
  });
  it('escapes raw html to prevent injection', () => {
    expect(mdToHtml('<script>alert(1)</script>')).not.toContain('<script>');
    expect(mdToHtml('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });
  it('renders an unordered list', () => {
    const html = mdToHtml('- one\n- two');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
  });
  it('renders a blockquote', () => {
    expect(mdToHtml('> wisdom')).toContain('<blockquote>wisdom</blockquote>');
  });
  it('renders a table', () => {
    const html = mdToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/blog/mdToHtml.test.ts`
Expected: FAIL — cannot find module `./mdToHtml`.

- [ ] **Step 3: Implement the converter**

Create `src/lib/blog/mdToHtml.ts`:
```ts
// escapeHtml MUST also escape quotes: link/image URLs and alt text are injected into
// double-quoted attributes below, so an unescaped " would allow attribute breakout XSS.
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Allow only safe URL schemes in links/images; anything else (javascript:, data:,
// vbscript:, …) collapses to '#'. Checked after escapeHtml, so compare loosely.
const SAFE_URL = /^(https?:\/\/|\/|#|mailto:)/i;
const safeUrl = (u: string): string => (SAFE_URL.test(u.trim()) ? u : '#');

const inline = (s: string): string =>
  escapeHtml(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m: string, alt: string, url: string) =>
      `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" />`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m: string, text: string, url: string) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

const isTableRow = (l: string) => /^\|.*\|\s*$/.test(l.trim());
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

/** Convert a limited Markdown block set to safe HTML. */
export const mdToHtml = (md: string): string => {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') { i++; continue; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(t)) { out.push('<hr />'); i++; continue; }

    // Heading
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }

    // Table (header row + separator + body rows)
    if (isTableRow(t) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1].trim())) {
      const head = cells(t);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { body.push(cells(lines[i])); i++; }
      const thead = `<thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(t)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(inline(lines[i].trim().replace(/^[-*]\s+/, ''))); i++; }
      out.push(`<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(inline(lines[i].trim().replace(/^\d+\.\s+/, ''))); i++; }
      out.push(`<ol>${items.map(x => `<li>${x}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph (gather until blank line)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return out.join('');
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/blog/mdToHtml.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Create the renderer component**

Create `src/components/blog/content/MarkdownRenderer.tsx`:
```tsx
import React from 'react';
import { mdToHtml } from '../../../lib/blog/mdToHtml';

// Renders one markdown segment's HTML. HTML is produced by mdToHtml, which escapes
// raw input first, so dangerouslySetInnerHTML is safe here.
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => (
  <div className="blog-md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
);
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/blog/mdToHtml.ts src/lib/blog/mdToHtml.test.ts src/components/blog/content/MarkdownRenderer.tsx
git commit -m "feat(blog): safe markdown block renderer"
```

---

## Task 6: Shortcode components

**Files:**
- Create: `src/components/blog/content/shortcodes/Calculator.tsx`
- Create: `src/components/blog/content/shortcodes/Chart.tsx`
- Create: `src/components/blog/content/shortcodes/YouTube.tsx`

- [ ] **Step 1: Emergency-fund calculator**

Create `src/components/blog/content/shortcodes/Calculator.tsx`:
```tsx
import React, { useState } from 'react';

// Phase 1 ships a single self-contained variant: emergency-fund. Unknown types render
// nothing (handled by ArticlePage's shortcode switch).
export const Calculator: React.FC<{ type?: string }> = ({ type }) => {
  const [daily, setDaily] = useState(1200);
  const [days, setDays] = useState(90);
  const [rate, setRate] = useState(15); // % of daily income saved
  if (type !== 'emergency-fund') return null;

  const target = daily * days;                 // fund goal
  const perDay = Math.round((daily * rate) / 100);
  const months = perDay > 0 ? Math.ceil(target / perDay / 30) : 0;

  return (
    <div style={S.box}>
      <div style={S.h}>📟 Emergency-fund calculator</div>
      <label style={S.row}>Daily income (KES)
        <input type="number" value={daily} onChange={e => setDaily(+e.target.value)} style={S.input} />
      </label>
      <label style={S.row}>Cover how many days?
        <input type="number" value={days} onChange={e => setDays(+e.target.value)} style={S.input} />
      </label>
      <label style={S.row}>Save what % of each day?
        <input type="number" value={rate} onChange={e => setRate(+e.target.value)} style={S.input} />
      </label>
      <div style={S.result}>
        Goal: <b>KES {target.toLocaleString()}</b> · Save <b>KES {perDay.toLocaleString()}/day</b>
        {months > 0 && <> → funded in ~<b>{months} months</b></>}
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  box: { background: 'var(--bg-surface)', border: '1px solid var(--border-acc)', borderRadius: 12, padding: 16, margin: '18px 0' },
  h: { fontSize: 12, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-2)', margin: '7px 0' },
  input: { width: 120, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, textAlign: 'right' },
  result: { marginTop: 10, padding: '10px 12px', background: 'var(--green-dim)', border: '1px solid var(--green-b)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)' },
};
```

- [ ] **Step 2: Simple bar chart**

Create `src/components/blog/content/shortcodes/Chart.tsx`:
```tsx
import React from 'react';

// Named datasets keep article bodies declarative: ::chart{data=mmf-growth}
const DATASETS: Record<string, { label: string; bars: { name: string; value: number }[] }> = {
  'mmf-growth': {
    label: 'KES 10,000 in an MMF at ~10% p.a.',
    bars: [
      { name: 'Yr 1', value: 11000 }, { name: 'Yr 2', value: 12100 },
      { name: 'Yr 3', value: 13310 }, { name: 'Yr 4', value: 14641 },
      { name: 'Yr 5', value: 16105 },
    ],
  },
};

export const Chart: React.FC<{ data?: string }> = ({ data }) => {
  const set = data ? DATASETS[data] : undefined;
  if (!set) return null;
  const max = Math.max(...set.bars.map(b => b.value));

  return (
    <figure style={S.box}>
      <div style={S.cap}>{set.label}</div>
      <div style={S.bars}>
        {set.bars.map(b => (
          <div key={b.name} style={S.col}>
            <div style={{ ...S.bar, height: `${(b.value / max) * 100}%` }} title={`KES ${b.value.toLocaleString()}`} />
            <div style={S.name}>{b.name}</div>
          </div>
        ))}
      </div>
    </figure>
  );
};

const S: Record<string, React.CSSProperties> = {
  box: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, margin: '18px 0' },
  cap: { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 },
  bars: { display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '70%', background: 'linear-gradient(180deg, var(--gold-l), var(--gold))', borderRadius: '4px 4px 0 0', minHeight: 4 },
  name: { fontSize: 11, color: 'var(--text-3)', marginTop: 6 },
};
```

- [ ] **Step 3: YouTube embed**

Create `src/components/blog/content/shortcodes/YouTube.tsx`:
```tsx
import React from 'react';

export const YouTube: React.FC<{ id?: string; title?: string }> = ({ id, title }) => {
  if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
  return (
    <div style={{ position: 'relative', paddingTop: '56.25%', margin: '18px 0', borderRadius: 12, overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title ?? 'Video'}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
};
```

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/content/shortcodes
git commit -m "feat(blog): calculator, chart, youtube shortcodes"
```

---

## Task 7: Article selectors (TDD)

**Files:**
- Create: `src/lib/blog/articleSelectors.ts`
- Test: `src/lib/blog/articleSelectors.test.ts`

Pure client-side helpers used by Home/Search (the featured pick and the search filter).

- [ ] **Step 1: Write the failing test**

Create `src/lib/blog/articleSelectors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pickFeatured, searchArticles } from './articleSelectors';
import type { Article } from '../../types';

const make = (over: Partial<Article>): Article => ({
  slug: 's', title: 'T', excerpt: 'E', coverImageUrl: '', categoryId: 'saving',
  authorName: 'A', authorAvatarUrl: '', bodyMarkdown: '', status: 'published',
  featured: false, readMinutes: 3, publishedAt: '2026-01-01T00:00:00.000Z',
  scheduledFor: null, createdAt: '', updatedAt: '',
  seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' },
  counts: { likes: 0, comments: 0, views: 0 }, ...over,
});

describe('pickFeatured', () => {
  it('returns the flagged article', () => {
    const list = [make({ slug: 'a' }), make({ slug: 'b', featured: true })];
    expect(pickFeatured(list)?.slug).toBe('b');
  });
  it('falls back to the newest when none flagged', () => {
    const list = [
      make({ slug: 'old', publishedAt: '2026-01-01T00:00:00.000Z' }),
      make({ slug: 'new', publishedAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(pickFeatured(list)?.slug).toBe('new');
  });
  it('returns null for empty list', () => {
    expect(pickFeatured([])).toBeNull();
  });
});

describe('searchArticles', () => {
  const list = [
    make({ slug: 'a', title: 'How to save on M-Pesa', excerpt: 'fees' }),
    make({ slug: 'b', title: 'Best MMF', excerpt: 'money market fund', categoryId: 'mmfs' }),
  ];
  it('returns all for empty query', () => {
    expect(searchArticles(list, '')).toHaveLength(2);
  });
  it('matches title case-insensitively', () => {
    expect(searchArticles(list, 'mpesa').map(a => a.slug)).toEqual([]); // no false match
    expect(searchArticles(list, 'm-pesa').map(a => a.slug)).toEqual(['a']);
  });
  it('matches excerpt', () => {
    expect(searchArticles(list, 'money market').map(a => a.slug)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/blog/articleSelectors.test.ts`
Expected: FAIL — cannot find module `./articleSelectors`.

- [ ] **Step 3: Implement**

Create `src/lib/blog/articleSelectors.ts`:
```ts
import type { Article } from '../../types';

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/** The featured article: the flagged one, else the most recently published. */
export const pickFeatured = (articles: Article[]): Article | null => {
  if (articles.length === 0) return null;
  const flagged = articles.find(a => a.featured);
  if (flagged) return flagged;
  return [...articles].sort((a, b) => time(b.publishedAt) - time(a.publishedAt))[0];
};

/** Case-insensitive substring match over title + excerpt. */
export const searchArticles = (articles: Article[], query: string): Article[] => {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  return articles.filter(a =>
    a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q),
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/blog/articleSelectors.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/articleSelectors.ts src/lib/blog/articleSelectors.test.ts
git commit -m "feat(blog): pickFeatured + searchArticles selectors"
```

---

## Task 8: SEO tag builder (TDD) + hook

**Files:**
- Create: `src/lib/blog/seo.ts`
- Test: `src/lib/blog/seo.test.ts`
- Create: `src/lib/blog/useSEO.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/blog/seo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildMetaTags } from './seo';
import type { Article } from '../../types';

const article = {
  slug: 'save-money', title: 'How to save money in Kenya', excerpt: 'Practical tips.',
  coverImageUrl: 'https://img/cover.jpg', categoryId: 'saving', authorName: 'Amina',
  authorAvatarUrl: '', bodyMarkdown: '', status: 'published', featured: true, readMinutes: 5,
  publishedAt: '2026-01-01T00:00:00.000Z', scheduledFor: null, createdAt: '', updatedAt: '',
  seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' },
  counts: { likes: 0, comments: 0, views: 0 },
} as Article;

describe('buildMetaTags', () => {
  it('uses seo overrides when present', () => {
    const a = { ...article, seo: { metaTitle: 'Custom T', metaDescription: 'Custom D', ogImageUrl: 'https://img/og.jpg' } };
    const tags = buildMetaTags(a, 'https://pesaflow.app');
    expect(tags.title).toBe('Custom T');
    expect(tags.description).toBe('Custom D');
    expect(tags.ogImage).toBe('https://img/og.jpg');
  });
  it('falls back to title/excerpt/cover', () => {
    const tags = buildMetaTags(article, 'https://pesaflow.app');
    expect(tags.title).toBe('How to save money in Kenya');
    expect(tags.description).toBe('Practical tips.');
    expect(tags.ogImage).toBe('https://img/cover.jpg');
    expect(tags.canonical).toBe('https://pesaflow.app/blog/save-money');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/blog/seo.test.ts`
Expected: FAIL — cannot find module `./seo`.

- [ ] **Step 3: Implement the builder**

Create `src/lib/blog/seo.ts`:
```ts
import type { Article } from '../../types';

export interface MetaTags {
  title: string;
  description: string;
  ogImage: string;
  canonical: string;
}

/** Resolve the effective meta tags for an article, applying seo overrides + fallbacks. */
export const buildMetaTags = (a: Article, origin: string): MetaTags => ({
  title: a.seo.metaTitle || a.title,
  description: a.seo.metaDescription || a.excerpt,
  ogImage: a.seo.ogImageUrl || a.coverImageUrl,
  canonical: a.seo.canonicalUrl || `${origin}/blog/${a.slug}`,
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/blog/seo.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create the hook that applies tags to the document**

Create `src/lib/blog/useSEO.ts`:
```ts
import { useEffect } from 'react';

interface SEOInput {
  title: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  type?: string; // 'website' | 'article'
}

const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
};

const setCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', href);
};

/** Imperatively set document title + meta/OG/Twitter tags for the current route. */
export const useSEO = ({ title, description, ogImage, canonical, type = 'website' }: SEOInput): void => {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    if (ogImage) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
    }
    if (canonical) {
      setCanonical(canonical);
      setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    }
    return () => { document.title = prev; };
  }, [title, description, ogImage, canonical, type]);
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/blog/seo.ts src/lib/blog/seo.test.ts src/lib/blog/useSEO.ts
git commit -m "feat(blog): SEO meta-tag builder + useSEO hook"
```

---

## Task 9: Firestore repositories

**Files:**
- Create: `src/lib/blog/articlesRepo.ts`
- Create: `src/lib/blog/categoriesRepo.ts`

These wrap Firestore queries for the public collections. They are the only place raw Firestore query APIs are used for the blog (mirrors how the app centralizes Firestore in `src/lib/firestore.ts`).

- [ ] **Step 1: Articles repo**

Create `src/lib/blog/articlesRepo.ts`:
```ts
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter,
  type QueryConstraint, type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Article, BlogFeedPage } from '../../types';

const PAGE = 9;

const toArticle = (snap: DocumentSnapshot): Article => ({ ...(snap.data() as Article), slug: snap.id });

/** One page of published articles, newest first. Pass a cursor slug to page forward. */
export const fetchFeed = async (cursorSlug: string | null, categoryId?: string): Promise<BlogFeedPage> => {
  const constraints: QueryConstraint[] = [where('status', '==', 'published')];
  if (categoryId) constraints.push(where('categoryId', '==', categoryId));
  constraints.push(orderBy('publishedAt', 'desc'));
  if (cursorSlug) {
    const cursorDoc = await getDoc(doc(db, 'articles', cursorSlug));
    if (cursorDoc.exists()) constraints.push(startAfter(cursorDoc));
  }
  constraints.push(limit(PAGE + 1)); // fetch one extra to detect "has more"

  const snap = await getDocs(query(collection(db, 'articles'), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > PAGE;
  const pageDocs = hasMore ? docs.slice(0, PAGE) : docs;
  return {
    articles: pageDocs.map(toArticle),
    cursor: hasMore ? pageDocs[pageDocs.length - 1].id : null,
  };
};

/** A single published article by slug, or null (also null for drafts — rules deny them). */
export const fetchArticle = async (slug: string): Promise<Article | null> => {
  try {
    const snap = await getDoc(doc(db, 'articles', slug));
    return snap.exists() && (snap.data() as Article).status === 'published' ? toArticle(snap) : null;
  } catch {
    return null; // rules deny reading a non-published doc
  }
};
```

- [ ] **Step 2: Categories repo**

Create `src/lib/blog/categoriesRepo.ts`:
```ts
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Category } from '../../types';

export const fetchCategories = async (): Promise<Category[]> => {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
  return snap.docs.map(d => ({ ...(d.data() as Category), id: d.id }));
};
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/blog/articlesRepo.ts src/lib/blog/categoriesRepo.ts
git commit -m "feat(blog): firestore repos for articles + categories"
```

---

## Task 10: Data hooks

**Files:**
- Create: `src/hooks/useCategories.ts`
- Create: `src/hooks/useArticles.ts`
- Create: `src/hooks/useArticle.ts`

- [ ] **Step 1: useCategories**

Create `src/hooks/useCategories.ts`:
```ts
import { useEffect, useState } from 'react';
import type { Category } from '../types';
import { fetchCategories } from '../lib/blog/categoriesRepo';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then(c => { if (alive) setCategories(c); })
      .catch(() => { /* empty hub is a valid state */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { categories, loading };
};
```

- [ ] **Step 2: useArticles (paginated feed)**

Create `src/hooks/useArticles.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import type { Article } from '../types';
import { fetchFeed } from '../lib/blog/articlesRepo';

/** Paginated published-article feed, optionally scoped to a category. */
export const useArticles = (categoryId?: string) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    try {
      const page = await fetchFeed(reset ? null : cursor, categoryId);
      setArticles(prev => (reset ? page.articles : [...prev, ...page.articles]));
      setCursor(page.cursor);
      setHasMore(page.cursor !== null);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cursor, categoryId]);

  // Reset when the category changes.
  useEffect(() => { setArticles([]); setCursor(null); setHasMore(true); load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [categoryId]);

  const loadMore = useCallback(() => { if (hasMore && !loading) load(false); }, [hasMore, loading, load]);

  return { articles, loadMore, hasMore, loading };
};
```

- [ ] **Step 3: useArticle (single)**

Create `src/hooks/useArticle.ts`:
```ts
import { useEffect, useState } from 'react';
import type { Article } from '../types';
import { fetchArticle } from '../lib/blog/articlesRepo';

export const useArticle = (slug: string | undefined) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchArticle(slug)
      .then(a => { if (alive) setArticle(a); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);
  return { article, loading };
};
```

- [ ] **Step 4: Verify compile + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; lint passes.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCategories.ts src/hooks/useArticles.ts src/hooks/useArticle.ts
git commit -m "feat(blog): useCategories, useArticles, useArticle hooks"
```

---

## Task 11: Small UI parts (chrome, cards, pills, empty state)

**Files:**
- Create: `src/components/blog/parts/BlogTopBar.tsx`
- Create: `src/components/blog/parts/ArticleCard.tsx`
- Create: `src/components/blog/parts/CategoryPills.tsx`
- Create: `src/components/blog/parts/SearchBar.tsx`
- Create: `src/components/blog/parts/EmptyState.tsx`

- [ ] **Step 1: BlogTopBar**

Create `src/components/blog/parts/BlogTopBar.tsx`:
```tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const BlogTopBar: React.FC = () => (
  <header style={S.bar}>
    <Link to="/blog" style={S.brand}>PesaFlow <span style={{ color: 'var(--gold)' }}>Learn</span></Link>
    <a href="/" style={S.cta}>Open PesaFlow →</a>
  </header>
);

const S: Record<string, React.CSSProperties> = {
  bar: { position: 'sticky', top: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-b)', backdropFilter: 'blur(10px)' },
  brand: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none' },
  cta: { fontSize: 13, fontWeight: 700, color: '#0A1628', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', padding: '8px 14px', borderRadius: 9, textDecoration: 'none' },
};
```

- [ ] **Step 2: ArticleCard**

Create `src/components/blog/parts/ArticleCard.tsx`:
```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import type { Article, Category } from '../../../types';

export const ArticleCard: React.FC<{ article: Article; category?: Category }> = ({ article, category }) => (
  <Link to={`/blog/${article.slug}`} style={S.card}>
    <div style={{ ...S.cover, backgroundImage: article.coverImageUrl ? `url(${article.coverImageUrl})` : undefined }} />
    <div style={S.body}>
      {category && <span style={S.pill}>{category.name}</span>}
      <div style={S.title}>{article.title}</div>
      <div style={S.excerpt}>{article.excerpt}</div>
      <div style={S.meta}>
        <span>{article.authorName}</span><span>·</span><span>{article.readMinutes} min</span>
        <span style={S.counts}><Heart size={12} /> {article.counts.likes} <MessageCircle size={12} /> {article.counts.comments}</span>
      </div>
    </div>
  </Link>
);

const S: Record<string, React.CSSProperties> = {
  card: { display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', boxShadow: 'var(--shadow-card)' },
  cover: { height: 150, background: 'linear-gradient(135deg, #FDBA74, #D97706 60%, #0A1628)', backgroundSize: 'cover', backgroundPosition: 'center' },
  body: { padding: 14 },
  pill: { display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 19, fontWeight: 700, color: 'var(--text-1)', margin: '8px 0 4px', lineHeight: 1.2 },
  excerpt: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 },
  meta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-3)', marginTop: 10 },
  counts: { display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' },
};
```

- [ ] **Step 3: CategoryPills**

Create `src/components/blog/parts/CategoryPills.tsx`:
```tsx
import React from 'react';
import type { Category } from '../../../types';

interface Props { categories: Category[]; activeId: string | null; onSelect: (id: string | null) => void; }

export const CategoryPills: React.FC<Props> = ({ categories, activeId, onSelect }) => (
  <div style={S.wrap}>
    <button style={pill(activeId === null)} onClick={() => onSelect(null)}>All</button>
    {categories.map(c => (
      <button key={c.id} style={pill(activeId === c.id)} onClick={() => onSelect(c.id)}>{c.name}</button>
    ))}
  </div>
);

const pill = (on: boolean): React.CSSProperties => ({
  flex: '0 0 auto', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
  color: on ? '#fff' : 'var(--text-2)', background: on ? 'var(--gold)' : 'var(--bg-card)',
  border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
});

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
};
```

- [ ] **Step 4: SearchBar**

Create `src/components/blog/parts/SearchBar.tsx`:
```tsx
import React from 'react';
import { Search } from 'lucide-react';

export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div style={S.wrap}>
    <Search size={16} color="var(--text-3)" />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Search money tips, guides, calculators…"
      style={S.input}
      aria-label="Search articles"
    />
  </div>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 12, padding: '11px 14px', boxShadow: 'var(--shadow)' },
  input: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-1)' },
};
```

- [ ] **Step 5: EmptyState**

Create `src/components/blog/parts/EmptyState.tsx`:
```tsx
import React from 'react';
import { BookOpen } from 'lucide-react';

export const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div style={S.wrap}>
    <div style={S.icon}><BookOpen size={26} color="var(--gold)" /></div>
    <div style={S.title}>{title}</div>
    <div style={S.body}>{body}</div>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { textAlign: 'center', padding: '56px 20px', maxWidth: 420, margin: '0 auto' },
  icon: { width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', margin: '0 auto 14px' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 },
  body: { fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 },
};
```

- [ ] **Step 6: Verify compile + commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add src/components/blog/parts/BlogTopBar.tsx src/components/blog/parts/ArticleCard.tsx src/components/blog/parts/CategoryPills.tsx src/components/blog/parts/SearchBar.tsx src/components/blog/parts/EmptyState.tsx
git commit -m "feat(blog): top bar, article card, pills, search, empty state"
```

---

## Task 12: Engagement + funnel parts (share, sign-up prompt, engagement bar, Ask-AI, progress, featured hero)

**Files:**
- Create: `src/components/blog/parts/SignUpPrompt.tsx`
- Create: `src/components/blog/parts/ShareBar.tsx`
- Create: `src/components/blog/parts/EngagementBar.tsx`
- Create: `src/components/blog/parts/AskAiCard.tsx`
- Create: `src/components/blog/parts/ReadingProgress.tsx`
- Create: `src/components/blog/parts/FeaturedHero.tsx`

- [ ] **Step 1: SignUpPrompt (gating modal)**

Create `src/components/blog/parts/SignUpPrompt.tsx`:
```tsx
import React from 'react';

// Phase 1 gating: engagement actions open this. Real like/comment persistence is Phase 2;
// wired Ask-AI is Phase 4. "Create account" sends the visitor into the main app at /.
export const SignUpPrompt: React.FC<{ title: string; body: string; onClose: () => void }> = ({ title, body, onClose }) => (
  <div style={S.overlay} role="dialog" aria-modal="true">
    <div style={S.backdrop} onClick={onClose} />
    <div style={S.modal}>
      <div style={S.title}>{title}</div>
      <p style={S.body}>{body}</p>
      <a href="/?intent=signup" style={S.primary}>Create a free account</a>
      <button style={S.link} onClick={onClose}>Keep reading</button>
    </div>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' },
  modal: { position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 },
  body: { fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 },
  primary: { display: 'block', padding: '11px 16px', background: 'linear-gradient(135deg, var(--gold), var(--gold-l))', color: '#0A1628', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 10 },
  link: { background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' },
};
```

- [ ] **Step 2: ShareBar (stateless, works in Phase 1)**

Create `src/components/blog/parts/ShareBar.tsx`:
```tsx
import React, { useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface Props { url: string; title: string; }

export const ShareBar: React.FC<Props> = ({ url, title }) => {
  const [copied, setCopied] = useState(false);
  const e = encodeURIComponent;
  const targets: { label: string; href: string; bg: string }[] = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${e(title + ' ' + url)}`, bg: '#25D366' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`, bg: '#1877F2' },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(title)}`, bg: '#0A0A0A' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`, bg: '#0A66C2' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${e(url)}&text=${e(title)}`, bg: '#0088cc' },
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  return (
    <div style={S.wrap}>
      {targets.map(t => (
        <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${t.label}`} style={{ ...S.btn, background: t.bg, color: '#fff' }}>
          {t.label[0]}
        </a>
      ))}
      <button onClick={copy} aria-label="Copy link" style={{ ...S.btn, background: 'var(--bg-surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
        {copied ? <Check size={15} /> : <Link2 size={15} />}
      </button>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, textDecoration: 'none', cursor: 'pointer' },
};
```

- [ ] **Step 3: EngagementBar (deferred like/comment/bookmark)**

Create `src/components/blog/parts/EngagementBar.tsx`:
```tsx
import React from 'react';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';
import type { Article } from '../../../types';

interface Props { article: Article; onGate: () => void; }

// Phase 1: buttons are visible and show counts, but any interaction opens the sign-up
// prompt. Real persistence arrives in Phase 2.
export const EngagementBar: React.FC<Props> = ({ article, onGate }) => (
  <div style={S.wrap}>
    <button style={S.btn} onClick={onGate}><Heart size={15} /> {article.counts.likes}</button>
    <button style={S.btn} onClick={onGate}><MessageCircle size={15} /> {article.counts.comments}</button>
    <button style={S.btn} onClick={onGate}><Bookmark size={15} /> Save</button>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 8 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, padding: '7px 13px', cursor: 'pointer' },
};
```

- [ ] **Step 4: AskAiCard (funnel)**

Create `src/components/blog/parts/AskAiCard.tsx`:
```tsx
import React from 'react';

// Phase 1: the funnel card is visible; the example prompt opens the sign-up prompt.
// Phase 4 wires this to the existing freeAdvisorAgent using the user's real data.
export const AskAiCard: React.FC<{ examplePrompt: string; onAsk: () => void }> = ({ examplePrompt, onAsk }) => (
  <div style={S.card}>
    <div style={S.inner}>
      <div style={S.title}>Need personalized advice?</div>
      <div style={S.desc}>Ask PesaFlow AI how this article applies to <i>your</i> financial situation.</div>
      <button style={S.ask} onClick={onAsk}>“{examplePrompt}” →</button>
    </div>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  card: { position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0A1628, #1E293B)', borderRadius: 16, padding: 20, margin: '24px 0' },
  inner: { position: 'relative', zIndex: 1 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 700, color: '#fff' },
  desc: { fontSize: 13, color: '#CBD5E1', margin: '4px 0 12px' },
  ask: { textAlign: 'left', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#FCD34D', cursor: 'pointer', width: '100%' },
};
```

- [ ] **Step 5: ReadingProgress**

Create `src/components/blog/parts/ReadingProgress.tsx`:
```tsx
import React, { useEffect, useState } from 'react';

export const ReadingProgress: React.FC = () => {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div style={S.track}><div style={{ ...S.bar, width: `${pct}%` }} /></div>
  );
};

const S: Record<string, React.CSSProperties> = {
  track: { position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'transparent', zIndex: 350 },
  bar: { height: '100%', background: 'linear-gradient(90deg, var(--gold-l), var(--gold))', transition: 'width .1s linear' },
};
```

- [ ] **Step 6: FeaturedHero**

Create `src/components/blog/parts/FeaturedHero.tsx`:
```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import type { Article, Category } from '../../../types';

export const FeaturedHero: React.FC<{ article: Article; category?: Category }> = ({ article, category }) => (
  <Link to={`/blog/${article.slug}`} style={S.wrap}>
    {article.coverImageUrl && <div style={{ ...S.cover, backgroundImage: `url(${article.coverImageUrl})` }} />}
    <div style={S.inner}>
      <span style={S.badge}>{category ? category.name : 'Featured'}</span>
      <div style={S.title}>{article.title}</div>
      <div style={S.excerpt}>{article.excerpt}</div>
      <div style={S.meta}>
        {article.authorName} · {article.readMinutes} min read
        <span style={S.counts}><Heart size={13} /> {article.counts.likes} <MessageCircle size={13} /> {article.counts.comments}</span>
      </div>
    </div>
  </Link>
);

const S: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', display: 'block', overflow: 'hidden', borderRadius: 18, minHeight: 260, background: 'linear-gradient(135deg, #0A1628, #1E293B)', textDecoration: 'none', color: '#fff', boxShadow: 'var(--shadow-lg)' },
  cover: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 },
  inner: { position: 'relative', zIndex: 1, padding: '28px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 260 },
  badge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: '#FCD34D', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', padding: '4px 11px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 700, lineHeight: 1.1, margin: '12px 0 6px', maxWidth: 640 },
  excerpt: { fontSize: 14, color: '#CBD5E1', maxWidth: 560, lineHeight: 1.5 },
  meta: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94A3B8', marginTop: 14 },
  counts: { display: 'inline-flex', alignItems: 'center', gap: 5 },
};
```

- [ ] **Step 7: Verify compile + commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add src/components/blog/parts/SignUpPrompt.tsx src/components/blog/parts/ShareBar.tsx src/components/blog/parts/EngagementBar.tsx src/components/blog/parts/AskAiCard.tsx src/components/blog/parts/ReadingProgress.tsx src/components/blog/parts/FeaturedHero.tsx
git commit -m "feat(blog): share, gating prompt, engagement, ask-ai, progress, hero"
```

---

## Task 13: BlogHome (Editorial)

**Files:**
- Create: `src/components/blog/BlogHome.tsx`

- [ ] **Step 1: Implement BlogHome**

Create `src/components/blog/BlogHome.tsx`:
```tsx
import React, { useMemo, useState } from 'react';
import { useArticles } from '../../hooks/useArticles';
import { useCategories } from '../../hooks/useCategories';
import { pickFeatured, searchArticles } from '../../lib/blog/articleSelectors';
import { useSEO } from '../../lib/blog/useSEO';
import { FeaturedHero } from './parts/FeaturedHero';
import { ArticleCard } from './parts/ArticleCard';
import { CategoryPills } from './parts/CategoryPills';
import { SearchBar } from './parts/SearchBar';
import { EmptyState } from './parts/EmptyState';

export const BlogHome: React.FC = () => {
  useSEO({
    title: 'Financial Learning Hub — PesaFlow',
    description: 'Practical money tips, investing guides, budgeting advice, and wealth-building strategies designed for everyday Kenyans.',
    canonical: `${window.location.origin}/blog`,
  });

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const { categories } = useCategories();
  const { articles, loadMore, hasMore, loading } = useArticles(activeCat ?? undefined);

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const featured = useMemo(() => pickFeatured(articles), [articles]);
  const visible = useMemo(
    () => searchArticles(articles, q).filter(a => a.slug !== featured?.slug),
    [articles, q, featured],
  );

  return (
    <div style={S.page}>
      <section style={S.hero}>
        <div style={S.kicker}>Financial Learning Hub</div>
        <h1 style={S.h1}>Practical money skills for everyday Kenyans</h1>
        <p style={S.sub}>Budgeting, investing, MMFs, SACCOs & wealth-building — explained simply.</p>
      </section>

      {featured && !loading && (
        <div style={S.block}><FeaturedHero article={featured} category={catById.get(featured.categoryId)} /></div>
      )}

      <div style={{ ...S.block, ...S.searchWrap }}><SearchBar value={q} onChange={setQ} /></div>
      <div style={S.block}><CategoryPills categories={categories} activeId={activeCat} onSelect={setActiveCat} /></div>

      {!loading && articles.length === 0 && (
        <EmptyState title="No articles yet" body="Fresh money guides are on the way. Check back soon — or open PesaFlow to start tracking your finances today." />
      )}

      {visible.length > 0 && (
        <div style={S.grid}>
          {visible.map(a => <ArticleCard key={a.slug} article={a} category={catById.get(a.categoryId)} />)}
        </div>
      )}

      {loading && <div style={S.loading}>Loading…</div>}

      {hasMore && !loading && !q && (
        <div style={S.moreWrap}><button style={S.more} onClick={loadMore}>Load more articles</button></div>
      )}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' },
  hero: { textAlign: 'center', padding: '18px 0 24px' },
  kicker: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.05em' },
  h1: { fontFamily: 'Cormorant Garamond, serif', fontSize: 38, fontWeight: 700, color: 'var(--text-1)', margin: '12px 0 8px', lineHeight: 1.08 },
  sub: { fontSize: 15, color: 'var(--text-2)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 },
  block: { marginBottom: 18 },
  searchWrap: { maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 24 },
  moreWrap: { textAlign: 'center', marginTop: 24 },
  more: { padding: '11px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 10, fontWeight: 700, fontSize: 14, color: 'var(--gold)', cursor: 'pointer' },
};
```

- [ ] **Step 2: Verify compile + commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add src/components/blog/BlogHome.tsx
git commit -m "feat(blog): editorial home page"
```

---

## Task 14: ArticlePage (Focused column) + shortcode switch

**Files:**
- Create: `src/components/blog/ArticlePage.tsx`

- [ ] **Step 1: Implement ArticlePage**

Create `src/components/blog/ArticlePage.tsx`:
```tsx
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useArticle } from '../../hooks/useArticle';
import { useCategories } from '../../hooks/useCategories';
import { parseSegments } from '../../lib/blog/markdown';
import { buildMetaTags } from '../../lib/blog/seo';
import { useSEO } from '../../lib/blog/useSEO';
import { MarkdownRenderer } from './content/MarkdownRenderer';
import { Calculator } from './content/shortcodes/Calculator';
import { Chart } from './content/shortcodes/Chart';
import { YouTube } from './content/shortcodes/YouTube';
import { ReadingProgress } from './parts/ReadingProgress';
import { ShareBar } from './parts/ShareBar';
import { EngagementBar } from './parts/EngagementBar';
import { AskAiCard } from './parts/AskAiCard';
import { SignUpPrompt } from './parts/SignUpPrompt';
import { EmptyState } from './parts/EmptyState';
import type { ContentSegment } from '../../types';

const renderSegment = (seg: ContentSegment, i: number): React.ReactNode => {
  if (seg.kind === 'markdown') return <MarkdownRenderer key={i} text={seg.text} />;
  switch (seg.name) {
    case 'calculator': return <Calculator key={i} type={seg.attrs.type} />;
    case 'chart': return <Chart key={i} data={seg.attrs.data} />;
    case 'youtube': return <YouTube key={i} id={seg.attrs.id} title={seg.attrs.title} />;
    default: return null; // unknown shortcode degrades gracefully
  }
};

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { article, loading } = useArticle(slug);
  const { categories } = useCategories();
  const [gate, setGate] = useState<null | { title: string; body: string }>(null);

  const segments = useMemo(() => (article ? parseSegments(article.bodyMarkdown) : []), [article]);
  const category = article ? categories.find(c => c.id === article.categoryId) : undefined;
  const meta = article ? buildMetaTags(article, window.location.origin) : null;

  useSEO({
    title: meta?.title ?? 'Article — PesaFlow',
    description: meta?.description,
    ogImage: meta?.ogImage,
    canonical: meta?.canonical,
    type: 'article',
  });

  if (loading) return <div style={S.loading}>Loading…</div>;
  if (!article) return (
    <EmptyState title="Article not found" body="This article may have been moved or unpublished. Browse the latest guides instead." />
  );

  const openGate = () => setGate({ title: "Join the conversation", body: "Create a free PesaFlow account to like, comment, and save articles — and get advice tailored to your money." });

  return (
    <article style={S.page}>
      <ReadingProgress />
      {category && <Link to={`/blog/category/${category.slug}`} style={S.pill}>{category.name}</Link>}
      <h1 style={S.title}>{article.title}</h1>
      <div style={S.byline}>
        <span style={S.avatar} />
        <span>{article.authorName}</span><span>·</span>
        {article.publishedAt && <span>{new Date(article.publishedAt).toLocaleDateString()}</span>}
        <span>·</span><span>{article.readMinutes} min read</span>
      </div>
      {article.coverImageUrl && <div style={{ ...S.cover, backgroundImage: `url(${article.coverImageUrl})` }} />}

      <div style={S.body}>{segments.map(renderSegment)}</div>

      <div style={S.engageRow}>
        <EngagementBar article={article} onGate={openGate} />
        <div style={{ marginLeft: 'auto' }}>
          <ShareBar url={window.location.href} title={article.title} />
        </div>
      </div>

      <AskAiCard
        examplePrompt="I earn KES 1,200 per day. How much should I save?"
        onAsk={() => setGate({ title: 'Ask PesaFlow AI', body: 'Create a free account so PesaFlow AI can answer using your real income and goals.' })}
      />

      {gate && <SignUpPrompt title={gate.title} body={gate.body} onClose={() => setGate(null)} />}
    </article>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: '0 auto', padding: '24px 18px 64px' },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 48 },
  pill: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-acc)', padding: '4px 11px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.04em', textDecoration: 'none' },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 34, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.12, margin: '12px 0 10px' },
  byline: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)', paddingBottom: 14, borderBottom: '1px solid var(--border)' },
  avatar: { width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  cover: { height: 300, borderRadius: 14, backgroundSize: 'cover', backgroundPosition: 'center', margin: '16px 0', background: 'linear-gradient(135deg, #FDBA74, #D97706 60%, #0A1628)' },
  body: { fontSize: 16.5, lineHeight: 1.75, color: 'var(--text-1)' },
  engageRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '20px 0', padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' },
};
```

- [ ] **Step 2: Add typographic spacing for rendered markdown**

Append to `src/styles/globals.css`:
```css
/* Blog article body — spacing for mdToHtml output */
.blog-md h2 { font-family:'Cormorant Garamond',serif; font-size:26px; font-weight:700; margin:26px 0 8px; }
.blog-md h3 { font-family:'Cormorant Garamond',serif; font-size:21px; font-weight:700; margin:22px 0 6px; }
.blog-md p { margin:14px 0; }
.blog-md ul,.blog-md ol { margin:14px 0; padding-left:22px; }
.blog-md li { margin:6px 0; }
.blog-md blockquote { border-left:3px solid var(--gold); background:var(--gold-dim); padding:10px 16px; border-radius:0 8px 8px 0; margin:16px 0; font-style:italic; }
.blog-md a { color:var(--gold); text-decoration:underline; }
.blog-md img { max-width:100%; border-radius:10px; margin:14px 0; }
.blog-md code { background:var(--bg-surface); border:1px solid var(--border); border-radius:5px; padding:1px 5px; font-size:.9em; }
.blog-md table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
.blog-md th,.blog-md td { border:1px solid var(--border); padding:8px 11px; text-align:left; }
.blog-md th { background:var(--bg-surface); font-weight:700; }
.blog-md hr { border:none; border-top:1px solid var(--border); margin:24px 0; }
```

- [ ] **Step 3: Verify compile + commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add src/components/blog/ArticlePage.tsx src/styles/globals.css
git commit -m "feat(blog): focused-column article page + markdown styles"
```

---

## Task 15: CategoryPage + BlogApp routes

**Files:**
- Create: `src/components/blog/CategoryPage.tsx`
- Modify: `src/components/blog/BlogApp.tsx`

- [ ] **Step 1: CategoryPage**

Create `src/components/blog/CategoryPage.tsx`:
```tsx
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { useArticles } from '../../hooks/useArticles';
import { useSEO } from '../../lib/blog/useSEO';
import { ArticleCard } from './parts/ArticleCard';
import { EmptyState } from './parts/EmptyState';

export const CategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { categories } = useCategories();
  const category = useMemo(() => categories.find(c => c.slug === categorySlug), [categories, categorySlug]);
  const { articles, loadMore, hasMore, loading } = useArticles(category?.id);
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  useSEO({
    title: `${category?.name ?? 'Category'} — PesaFlow Learn`,
    description: category?.description,
    canonical: `${window.location.origin}/blog/category/${categorySlug}`,
  });

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{category?.name ?? 'Category'}</h1>
      {category?.description && <p style={S.desc}>{category.description}</p>}

      {!loading && articles.length === 0 && (
        <EmptyState title="Nothing here yet" body="No articles in this category yet. Explore other topics from the home page." />
      )}
      <div style={S.grid}>
        {articles.map(a => <ArticleCard key={a.slug} article={a} category={catById.get(a.categoryId)} />)}
      </div>
      {loading && <div style={S.loading}>Loading…</div>}
      {hasMore && !loading && <div style={S.moreWrap}><button style={S.more} onClick={loadMore}>Load more</button></div>}
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' },
  h1: { fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 700, color: 'var(--text-1)' },
  desc: { fontSize: 15, color: 'var(--text-2)', margin: '6px 0 22px', maxWidth: 560 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 },
  loading: { textAlign: 'center', color: 'var(--text-3)', padding: 24 },
  moreWrap: { textAlign: 'center', marginTop: 24 },
  more: { padding: '11px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-acc)', borderRadius: 10, fontWeight: 700, fontSize: 14, color: 'var(--gold)', cursor: 'pointer' },
};
```

- [ ] **Step 2: Replace the BlogApp placeholder with real routes**

Overwrite `src/components/blog/BlogApp.tsx`:
```tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '../Header';
import { BlogTopBar } from './parts/BlogTopBar';
import { BlogHome } from './BlogHome';
import { ArticlePage } from './ArticlePage';
import { CategoryPage } from './CategoryPage';

// Public Financial Learning Hub. Rendered outside AuthGate (see main.tsx) so logged-out
// visitors and crawlers can read. ThemeProvider gives blog pages the same light/dark theme.
export const BlogApp: React.FC = () => (
  <ThemeProvider>
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <BlogTopBar />
      <Routes>
        <Route index element={<BlogHome />} />
        <Route path="category/:categorySlug" element={<CategoryPage />} />
        <Route path=":slug" element={<ArticlePage />} />
        <Route path="*" element={<Navigate to="/blog" replace />} />
      </Routes>
    </div>
  </ThemeProvider>
);
```

Note: routes are relative because this tree is mounted at `/blog/*` in `main.tsx`. Confirm `ThemeProvider` is exported from `src/components/Header.tsx` (it is imported there in `App.tsx`); if it is not a named export, wrap with the same provider `App.tsx` uses.

- [ ] **Step 3: Verify compile + build + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; build succeeds.
```bash
git add src/components/blog/CategoryPage.tsx src/components/blog/BlogApp.tsx
git commit -m "feat(blog): category page + wire BlogApp routes"
```

---

## Task 16: "Learn" entry point from the main app

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Locate the header top bar**

Run: `grep -n "score\|topbar\|<header\|brand\|logo\|return (" src/components/Header.tsx | head -20`
Identify the top-bar JSX region (near the score badge / brand). We add a simple anchor link to `/blog` there.

- [ ] **Step 2: Add a "Learn" link**

In the header's top-bar JSX (beside the existing brand/score area), add:
```tsx
<a
  href="/blog"
  style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
    color: 'var(--gold)', textDecoration: 'none', padding: '6px 12px',
    border: '1px solid var(--border-acc)', borderRadius: 999,
  }}
  title="Financial Learning Hub"
>
  Learn
</a>
```
Use a plain anchor (full navigation) so the blog loads independently of the app's state machine.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.
```bash
git add src/components/Header.tsx
git commit -m "feat(blog): add Learn link from app header to /blog"
```

---

## Task 17: Firestore security rules + indexes

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add blog rules**

In `firestore.rules`, inside `match /databases/{database}/documents {`, add these blocks (after the `subscribers` block):
```
    // Blog: articles — public read ONLY when published; writes are admin-only.
    // List/query reads must filter to status=='published' to satisfy this rule.
    match /articles/{slug} {
      allow read: if resource.data.status == 'published';
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Blog: categories — public read; admin write.
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
```

- [ ] **Step 2: Add composite indexes**

Replace the `indexes` array in `firestore.indexes.json` so it includes the existing chat index plus the blog indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "chat",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "articles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "articles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "categoryId", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 3: Deploy rules + indexes**

Run:
```bash
npx firebase deploy --only firestore:rules,firestore:indexes
```
Expected: rules + indexes deploy successfully. (If the Firebase CLI is not authenticated locally, note this step must be run by a maintainer with deploy access — the JSON/rules files are committed regardless.)

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "feat(blog): public-read rules + composite indexes for articles/categories"
```

---

## Task 18: Dev seed script + verification

**Files:**
- Create: `src/scripts/seedBlog.ts`

The seed writes public collections. Because article writes are admin-gated, seeding runs against a **temporary permissive rule** (dev-only), documented below — mirroring the "run once then delete" pattern of `seedAdmin.ts`.

- [ ] **Step 1: Create the seed script**

Create `src/scripts/seedBlog.ts`:
```ts
// DEV ONLY. Seeds sample categories + articles so the reader can be verified end-to-end.
// Production starts empty. Run: npx vite-node src/scripts/seedBlog.ts
// Article writes are admin-gated in production rules; to run this locally, temporarily
// set `allow write: if true;` on /articles and /categories, deploy, seed, then RESTORE
// the admin-only rule (see Task 17). Delete this file after use.

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { readMinutes } from '../lib/blog/readTime';
import type { Article, Category } from '../types';

const now = new Date().toISOString();

const categories: Category[] = [
  { id: 'budgeting', name: 'Budgeting', slug: 'budgeting', description: 'Plan and control your monthly money.', order: 1, colorToken: '--gold' },
  { id: 'saving', name: 'Saving', slug: 'saving', description: 'Build cushions and hit your goals.', order: 2, colorToken: '--green' },
  { id: 'investing', name: 'Investing', slug: 'investing', description: 'Grow your money over time.', order: 3, colorToken: '--blue' },
  { id: 'mmfs', name: 'MMFs', slug: 'mmfs', description: 'Money market funds in Kenya.', order: 4, colorToken: '--gold' },
  { id: 'saccos', name: 'SACCOs', slug: 'saccos', description: 'Savings & credit cooperatives.', order: 5, colorToken: '--green' },
  { id: 'side-hustles', name: 'Side Hustles', slug: 'side-hustles', description: 'Extra income ideas.', order: 6, colorToken: '--amber' },
];

const emergencyBody = `Living on a daily income doesn't mean you can't build a safety net. Here's a plan that fits hustlers.

## Start with your daily number

Track what you truly need to survive one day — food, fare, rent share, airtime.

> Save a fixed slice of every good day, not a fixed amount every month.

::calculator{type=emergency-fund}

## Where to keep it

A money market fund stays liquid and earns interest. Over time it compounds:

::chart{data=mmf-growth}

Keep going and your fund will be ready before you know it.`;

const articles: Article[] = [
  {
    slug: 'how-to-build-emergency-fund-daily-income-kenya',
    title: 'How to build a 3-month emergency fund on a daily income',
    excerpt: 'A step-by-step plan for boda riders, mama mbogas and anyone earning day-to-day.',
    coverImageUrl: '', categoryId: 'saving', authorName: 'Amina Wanjiru', authorAvatarUrl: '',
    bodyMarkdown: emergencyBody, status: 'published', featured: true, readMinutes: readMinutes(emergencyBody),
    publishedAt: now, scheduledFor: null, createdAt: now, updatedAt: now,
    seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' }, counts: { likes: 128, comments: 24, views: 1450 },
  },
  {
    slug: 'best-money-market-funds-kenya-2026',
    title: 'Best money market funds in Kenya (2026)',
    excerpt: 'How MMFs work, what returns to expect, and how to pick one.',
    coverImageUrl: '', categoryId: 'mmfs', authorName: 'James Kariuki', authorAvatarUrl: '',
    bodyMarkdown: '## What is an MMF?\n\nA money market fund pools savings and invests in low-risk instruments.\n\n- Liquid — withdraw in days\n- Earns ~10% p.a.\n- Low minimums\n\n::chart{data=mmf-growth}',
    status: 'published', featured: false, readMinutes: 5,
    publishedAt: now, scheduledFor: null, createdAt: now, updatedAt: now,
    seo: { metaTitle: '', metaDescription: '', ogImageUrl: '' }, counts: { likes: 92, comments: 12, views: 980 },
  },
];

for (const c of categories) await setDoc(doc(db, 'categories', c.id), c);
for (const a of articles) await setDoc(doc(db, 'articles', a.slug), a);

console.log(`Seeded ${categories.length} categories and ${articles.length} articles.`);
console.log('RESTORE the admin-only write rule on /articles and /categories now. Then delete this file.');
```

- [ ] **Step 2: Seed and verify manually**

1. Temporarily set `allow write: if true;` on `/articles` and `/categories` in `firestore.rules`, then `npx firebase deploy --only firestore:rules`.
2. Run: `npx vite-node src/scripts/seedBlog.ts` → expect "Seeded 6 categories and 2 articles."
3. **Restore** the admin-only write rule (Task 17 Step 1) and redeploy rules.
4. Run: `npm run dev`, then verify in the browser:
   - `/blog` shows the featured hero + a card, category pills, search.
   - Searching "mmf" filters the feed.
   - Clicking the featured article opens `/blog/how-to-build-emergency-fund-daily-income-kenya`; the reading-progress bar moves; the calculator + chart render; share buttons open share dialogs; Copy Link copies; clicking Like opens the sign-up prompt; the Ask-AI card opens the prompt.
   - `/blog/category/saving` lists the emergency-fund article.
   - Visiting a bad slug (`/blog/nope`) shows the "Article not found" empty state.
   - Set the emergency-fund article's `status` to `draft` in Firestore console → confirm it disappears from `/blog` and its URL shows "not found" (rule denies non-published reads).

- [ ] **Step 3: Commit (script only; do not commit seeded data)**

```bash
git add src/scripts/seedBlog.ts
git commit -m "chore(blog): dev seed script for verification"
```

---

## Task 19: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `slug`, `readTime`, `markdown`, `mdToHtml`, `articleSelectors`, `seo` suites.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `tsc -b && vite build` succeeds.

- [ ] **Step 4: Regression check on the main app**

Run `npm run dev`, then confirm:
- `/` still loads the existing app; Google sign-in completes; navigating the app works.
- The header "Learn" link opens `/blog`.
- Refreshing directly on `/blog/<slug>` loads the article (Vercel SPA rewrite already routes unknown paths to `index.html`; verified in `vercel.json`).

- [ ] **Step 5: Final commit (if any lint/build fixups were needed)**

```bash
git add -A
git commit -m "chore(blog): phase 1 verification fixups"
```

---

## Self-Review Notes (coverage against spec)

- **Public read + gated actions** → Task 17 rules (public read published), Task 12 `SignUpPrompt` + `EngagementBar`/`AskAiCard` gating.
- **Real URLs `/blog/:slug`** → Task 0 router, Task 15 `BlogApp` routes.
- **Editorial home** → Task 13 (`FeaturedHero`, search, pills, feed, load-more).
- **Focused-column article** → Task 14 (progress bar, byline, markdown+shortcodes, share, engagement, Ask-AI).
- **Markdown + shortcodes** → Tasks 4–6 (parser, renderer, calculator/chart/youtube; unknown → null).
- **Firestore schema/rules/indexes** → Task 1 types, Task 9 repos, Task 17 rules+indexes.
- **SEO client tags** → Task 8 `useSEO` applied in Home/Article/Category.
- **Working share** → Task 12 `ShareBar` (WhatsApp/FB/X/LinkedIn/Telegram/Copy).
- **Empty states + dev seed** → Tasks 11/18.
- **Entry point** → Task 16 header link.
- **Deferred (P2–P5), explicitly out of scope:** working likes/comments persistence, CMS editor, wired Ask-AI/newsletter/community, prerender/sitemap/analytics/bonus — none implemented here, matching the spec's phase boundaries.
