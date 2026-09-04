const RE = /\b(TODO|TBD|FIXME|lorem ipsum)\b/i;

export const rule = {
  id: 'placeholder.present',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const head = f.body.split('\n').slice(0, 20).join('\n');
      const m = head.match(RE);
      if (m) out.push({ file: f.relPath,
        line: f.bodyStartLine + head.slice(0, m.index).split('\n').length - 1,
        message: `placeholder text: ${m[0]}`,
        hint: 'unfinished content erodes trust — finish or remove' });
    }
    return out;
  },
};
