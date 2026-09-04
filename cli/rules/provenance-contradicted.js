const CALLOUT = /\[!contradiction\]([^\n]*)/;

export const rule = {
  id: 'provenance.contradicted',
  run(model) {
    const out = [];
    const targetsIn = b => [...b.matchAll(/\[\[([^\]|\n]+)/g)].map(x => x[1].trim().replace(/\.md$/, ''));
    for (const f of model.files) {
      const m = f.body.match(CALLOUT);
      const calloutTargets = m ? targetsIn(m[1]) : [];
      const fmList = (f.fm?.fields?.contradicted_by || '').replace(/[\[\]]/g, '');
      const fmTargets = fmList ? fmList.split(',').map(s => s.trim()).filter(Boolean).map(t => t.replace(/\.md$/, '')) : [];
      if (m && !fmTargets.length) out.push({ file: f.relPath,
        line: f.bodyStartLine + f.body.slice(0, m.index).split('\n').length - 1,
        message: 'contradiction callout without contradicted_by in frontmatter',
        hint: 'mirror the contradiction in frontmatter so lint can check both sides' });
      if (!m && fmTargets.length) out.push({ file: f.relPath, line: 1,
        message: 'contradicted_by lists targets but no [!contradiction] callout in body',
        hint: 'surface the conflict in the body so readers see it' });
      if (m && fmTargets.length) {
        const a = new Set(calloutTargets), b = new Set(fmTargets);
        const onlyCallout = [...a].filter(t => !b.has(t));
        const onlyFm = [...b].filter(t => !a.has(t));
        if (onlyCallout.length || onlyFm.length) out.push({ file: f.relPath, line: 1,
          message: `contradiction target sets differ — callout-only: [${onlyCallout.join(', ') || 'none'}], frontmatter-only: [${onlyFm.join(', ') || 'none'}]`,
          hint: 'make the body callout and contradicted_by list agree' });
      }
    }
    return out;
  },
};
