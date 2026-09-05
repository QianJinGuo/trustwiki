// markers are case-sensitive conventions (TODO/FIXME/TBD) or colon-anchored;
// bare lowercase "todo" in prose (Spanish "todo", domain terms like
// "to-do list entity") is vocabulary, not a marker — see eval round 2b.
const RE = null; // matching is inline in run() — kept for interface stability

export const rule = {
  id: 'placeholder.present',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const head = f.body.split('\n').slice(0, 20).join('\n');
      for (const m of head.matchAll(/\b(TODO|FIXME|lorem ipsum|TBD)\b|\btodo\b/g)) {
        const word = m[0];
        const lower = word.toLowerCase();
        const before = head.slice(Math.max(0, m.index - 2), m.index);
        const after = head.slice(m.index + m[0].length, m.index + m[0].length + 2);
        // markers: "TODO"/"FIXME" in caps, or any case followed by ":" —
        // bare lowercase "todo" as a plain word (Spanish "todo", domain terms)
        // is vocabulary, not a marker
        const isMarker = word === 'TODO' || word === 'FIXME' || word === 'TBD'
          || /[:：]\s*$/.test(after) || /^lorem/i.test(word);
        if (!isMarker) continue;
        out.push({ file: f.relPath,
          line: f.bodyStartLine + head.slice(0, m.index).split('\n').length - 1,
          message: `placeholder text: ${m[0]}`,
          hint: 'unfinished content erodes trust — finish or remove' });
        break; // one finding per file is enough to surface the pattern
      }
    }
    return out;
  },
};
