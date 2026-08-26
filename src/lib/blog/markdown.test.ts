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
