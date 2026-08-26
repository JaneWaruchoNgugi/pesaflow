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
