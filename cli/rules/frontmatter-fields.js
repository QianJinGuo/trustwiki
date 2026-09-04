const BASE = ['title', 'created', 'updated', 'type', 'tags'];
const SOURCE = ['source_url', 'ingested', 'sha256'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const SHA_RE = /^[0-9a-f]{64}$/i;
const STATES = new Set(['extracted', 'merged', 'inferred', 'ambiguous']);

export const rule = {
  id: 'frontmatter.fields',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      const isSource = f.fm.fields.type === 'source'
        || (model.config.sourceDir && f.relPath.startsWith(`${model.config.sourceDir}/`));
      const missing = [...BASE, ...(isSource ? SOURCE : [])].filter(k => !f.fm.fields[k]);
      if (missing.length) out.push({ file: f.relPath, line: 1,
        message: `missing frontmatter field(s): ${missing.join(', ')}`,
        hint: 'see schema/spec.md — Frontmatter' });
      const bad = [];
      for (const k of ['created', 'updated']) {
        if (f.fm.fields[k] && !DATE_RE.test(f.fm.fields[k])) bad.push(`${k} is not an ISO date`);
      }
      if (f.fm.fields.provenance_state && !STATES.has(f.fm.fields.provenance_state)) {
        bad.push(`provenance_state "${f.fm.fields.provenance_state}" is not one of extracted|merged|inferred|ambiguous`);
      }
      const conf = Number(f.fm.fields.confidence);
      if (f.fm.fields.confidence && (Number.isNaN(conf) || conf < 0 || conf > 1)) {
        bad.push('confidence must be a number between 0 and 1');
      }
      if (isSource && f.fm.fields.sha256 && !SHA_RE.test(f.fm.fields.sha256)) {
        bad.push('sha256 must be 64 hex characters');
      }
      if (bad.length) out.push({ file: f.relPath, line: 1,
        message: `invalid frontmatter value(s): ${bad.join('; ')}`,
        hint: 'see schema/spec.md — Frontmatter' });
    }
    return out;
  },
};
