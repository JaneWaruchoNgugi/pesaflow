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
