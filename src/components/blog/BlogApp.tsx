import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header, ThemeProvider } from '../Header';
import type { AppView } from '../../types';
import { BlogHome } from './BlogHome';
import { ArticlePage } from './ArticlePage';
import { CategoryPage } from './CategoryPage';
import { SavedArticlesPage } from './SavedArticlesPage';

// Clicking an app nav item from the public blog leaves the /blog route tree and opens
// the main app at that section. App.tsx reads ?view= on load to land there.
const goToAppView = (id: AppView) => { window.location.href = `/?view=${id}`; };

// Public Financial Learning Hub. Rendered outside AuthGate (see main.tsx) so logged-out
// visitors and crawlers can read. It reuses the app's Header in menu-only mode so the
// same sidebar + bottom nav are available for navigating back into the app, and mirrors
// the app's shell markup so the responsive layout matches exactly.
export const BlogApp: React.FC = () => (
  <ThemeProvider>
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        minimal
        activeView={'' as AppView}   // no app view is "active" while on the blog
        onNavigate={goToAppView}
        score={0}
        scoreLevel="fair"
        userTier="free"
      />
      <main className="main-content">
        <Routes>
          <Route index element={<BlogHome />} />
          <Route path="saved" element={<SavedArticlesPage />} />
          <Route path="category/:categorySlug" element={<CategoryPage />} />
          <Route path=":slug" element={<ArticlePage />} />
          <Route path="*" element={<Navigate to="/blog" replace />} />
        </Routes>
      </main>
    </div>
  </ThemeProvider>
);
