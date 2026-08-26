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
