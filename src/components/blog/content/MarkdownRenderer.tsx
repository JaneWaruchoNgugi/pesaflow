import React from 'react';
import { mdToHtml } from '../../../lib/blog/mdToHtml';

// Renders one markdown segment's HTML. HTML is produced by mdToHtml, which escapes
// raw input first, so dangerouslySetInnerHTML is safe here.
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => (
  <div className="blog-md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
);
