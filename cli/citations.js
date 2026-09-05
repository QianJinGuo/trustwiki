const CITATION_RE = /\^\[([^\]\n]*)\]/g;
const RANGE_ANCHOR = /^([^:\s]+)#L(\d+)-L(\d+)$/;
const RANGE_COLON = /^([^:\s]+):(\d+)-(\d+)$/;

export function parseCitation(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty citation' };
  const sources = [];
  for (const part of trimmed.split(',').map(s => s.trim())) {
    const s = parseSource(part);
    if (!s.ok) return s;
    sources.push(s.source);
  }
  return { ok: true, sources };
}

function parseSource(part) {
  let m = part.match(RANGE_ANCHOR);
  if (m) return finish(m[1], Number(m[2]), Number(m[3]), part);
  m = part.match(RANGE_COLON);
  if (m) return finish(m[1], Number(m[2]), Number(m[3]), part);
  return finish(part, null, null, part);
}

function finish(path, start, end, part) {
  path = path.trim();
  if (!path || /[\s:]/.test(path)) return { ok: false, reason: `bad source syntax: "${part}" (path cannot contain spaces or colons)` };
  if (start !== null && (start < 1 || end < 1)) return { ok: false, reason: `line numbers must be positive in "${part}"` };
  if (start !== null && start > end) return { ok: false, reason: `reversed line range in "${part}" (start > end)` };
  return { ok: true, source: { path, start, end } };
}

export function findCitations(body, bodyStartLine) {
  const citations = [], malformed = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(CITATION_RE)) {
      const parsed = parseCitation(m[1]);
      const at = { raw: m[0], line: bodyStartLine + i };
      if (parsed.ok) citations.push({ ...at, sources: parsed.sources });
      else malformed.push({ ...at, reason: parsed.reason });
    }
  }
  return { citations, malformed };
}
