const CALLOUT = /\[!contradiction\]([^\n]*)/;

export const rule = {
  id: 'provenance.contradicted',
  run(model) {
    const out = [];
    const targetsIn = b => [...b.matchAll(/\[\[([^\]|\n]+)/g)].map(x => x[1].trim());
    for (const f of model.files) {
      const m = f.body.match(CALLOUT);
      const fmList = (f.fm?.fields?.contradicted_by || '').replace(/[\[\]]/g, '');
      const fmTargets = fmList ? fmList.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (m && !fmTargets.length) out.push({ file: f.relPath,
        line: f.bodyStartLine + f.body.slice(0, m.index).split('\n').length - 1,
        message: 'contradiction callout without contradicted_by in frontmatter',
        hint: 'mirror the contradiction in frontmatter so lint can check both sides' });
      if (!m && fmTargets.length) out.push({ file: f.relPath, line: 1,
        message: 'contradicted_by lists targets but no [!contradiction] callout in body',
        hint: 'surface the conflict in the body so readers see it' });
    }
    return out;
  },
};
