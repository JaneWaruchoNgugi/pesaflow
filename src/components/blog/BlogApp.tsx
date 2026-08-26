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
