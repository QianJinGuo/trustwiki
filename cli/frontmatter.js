export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { ok: false, reason: 'missing', body: text, bodyStartLine: 1 };
  const lines = text.split('\n');
  // closing --- must be on its own line, not the first
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endLine = i; break; } // 0-based index i => 1-based line i+1
  }
  if (endLine === -1) return { ok: false, reason: 'unterminated', body: text, bodyStartLine: 1 };
  const fields = {};
  let lastKey = null;
  for (let i = 1; i < endLine; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (m && !line.startsWith(' ') && !line.startsWith('-')) {
      const k = m[1].toLowerCase();
      const v = m[2].trim();
      if (v === '' || ['|', '|-', '|+', '>', '>-', '>+'].includes(v)) { fields[k] = ''; lastKey = k; }
      else { fields[k] = v.replace(/^["']|["']$/g, ''); lastKey = null; }
    } else if (lastKey && (line.startsWith(' ') || line.startsWith('- '))) {
      fields[lastKey] = `${fields[lastKey]} ${line.replace(/^(\s+|- )/, '')}`.trim();
    }
  }
  const body = lines.slice(endLine + 1).join('\n');
  return { ok: true, fields, body, bodyStartLine: endLine + 2 };
}

export function parseList(value) {
  if (!value) return [];
  const inner = String(value).trim().replace(/^\[|\]$/g, '');
  return inner ? inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}
