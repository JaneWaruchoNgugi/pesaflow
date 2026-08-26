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
  it('escapes double quotes to prevent attribute breakout', () => {
    expect(mdToHtml('say "hi"')).toContain('&quot;hi&quot;');
  });
  it('neutralizes onmouseover breakout in a link url', () => {
    const html = mdToHtml('[x](https://safe.com" onmouseover="alert(1))');
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toContain('&quot;');
  });
  it('neutralizes onerror breakout in an image url', () => {
    const html = mdToHtml('![a](https://x.com" onerror="alert(1))');
    expect(html).not.toContain('onerror="alert(1)"');
  });
  it('drops javascript: urls to #', () => {
    const html = mdToHtml('[x](javascript:alert%281%29)');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });
  it('still allows normal https links', () => {
    expect(mdToHtml('[MMF](https://x.com)'))
      .toContain('<a href="https://x.com" target="_blank" rel="noopener noreferrer">MMF</a>');
  });
});
