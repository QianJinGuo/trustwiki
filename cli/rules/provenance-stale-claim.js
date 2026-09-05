import { resolveInVault } from '../resolve.js';

// provenance.stale-claim — v0.2 (claim half-life annotation)
//
// v0.1 answered "does this claim have a citation"; this rule answers "is this
// claim past its prime". Half-life classes live on the SOURCE page (facts are
// born there, dated there):
//   claim_class: model-generation   → resolved via config.halfLives
//   halflife_days: 42               → direct override
// Age = asOf − source.ingested (or created): how long the vault has HELD the
// claim. Unclassified or undated sources are skipped — the rule never guesses.
// When a paragraph cites several classified sources, the oldest governs.

const DAY = 24 * 60 * 60 * 1000;

export const rule = {
  id: 'provenance.stale-claim',
  run(model) {
    const out = [];
    const cfg = model.config;
    const classes = cfg.halfLives || {};
    const asOf = cfg.asOf ? new Date(cfg.asOf + 'T00:00:00Z') : new Date();
    if (Number.isNaN(asOf.getTime()) || !Object.keys(classes).length) return out;

    const srcMeta = new Map(); // "rel-without-ext" and "basename-without-ext" → meta
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      const fl = f.fm.fields;
      let hl = null, label = null;
      if (fl.halflife_days !== undefined && fl.halflife_days !== '') {
        hl = Number(fl.halflife_days);
        label = `half-life ${hl}d`;
      } else if (fl.claim_class && classes[fl.claim_class] !== undefined) {
        hl = Number(classes[fl.claim_class]);
        label = `class "${fl.claim_class}", half-life ${hl}d`;
      }
      if (hl === null || Number.isNaN(hl) || hl <= 0) continue;
      const dateStr = String(fl.ingested || fl.created || '').slice(0, 10);
      const born = new Date(dateStr + 'T00:00:00Z');
      if (Number.isNaN(born.getTime())) continue;
      const age = Math.floor((asOf.getTime() - born.getTime()) / DAY);
      if (age < 0) continue;
      const meta = { age, hl, label, date: dateStr };
      const key = f.relPath.replace(/\.md$/, '');
      if (!srcMeta.has(key)) srcMeta.set(key, meta);
      const base = key.split('/').pop();
      if (!srcMeta.has(base)) srcMeta.set(base, meta);
    }
    if (!srcMeta.size) return out;

    for (const f of model.files) {
      if (!f.fm.ok) continue;
      if ((cfg.inferredSkipTypes || []).includes(f.fm.fields.type)) continue;
      if (cfg.sourceDir && f.relPath.startsWith(`${cfg.sourceDir}/`)) continue;
      for (const p of f.paragraphs) {
        if (!p.isProse || !p.text) continue;
        const lastLine = p.startLine + p.text.split('\n').length - 1;
        const paraCites = f.citations.filter(c => c.line >= p.startLine && c.line <= lastLine);
        let worst = null;
        for (const c of paraCites) {
          for (const s of c.sources) {
            const norm = s.path.replace(/\.md$/, '');
            for (const key of [norm, norm.split('/').pop()]) {
              const meta = srcMeta.get(key);
              if (meta && (!worst || meta.age > worst.age)) { worst = { ...meta, src: s.path }; }
            }
          }
        }
        if (worst && worst.age > worst.hl) {
          out.push({ file: f.relPath, line: p.startLine,
            message: `stale claim: source ${worst.src} ingested ${worst.date} — held ${worst.age}d (${worst.label})`,
            hint: 're-verify against the live world, re-cite a newer source, or re-date with evidence' });
        }
      }
    }
    return out;
  },
};
