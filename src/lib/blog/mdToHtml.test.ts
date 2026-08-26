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
