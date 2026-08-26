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
