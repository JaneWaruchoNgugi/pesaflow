const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s: string): string =>
  escapeHtml(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

const isTableRow = (l: string) => /^\|.*\|\s*$/.test(l.trim());
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

/** Convert a limited Markdown block set to safe HTML. */
export const mdToHtml = (md: string): string => {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') { i++; continue; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(t)) { out.push('<hr />'); i++; continue; }

    // Heading
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }

    // Table (header row + separator + body rows)
    if (isTableRow(t) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1].trim())) {
      const head = cells(t);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { body.push(cells(lines[i])); i++; }
      const thead = `<thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(t)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(inline(lines[i].trim().replace(/^[-*]\s+/, ''))); i++; }
      out.push(`<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(inline(lines[i].trim().replace(/^\d+\.\s+/, ''))); i++; }
      out.push(`<ol>${items.map(x => `<li>${x}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph (gather until blank line)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return out.join('');
};
