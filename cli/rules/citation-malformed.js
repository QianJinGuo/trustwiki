export const rule = {
  id: 'citation.malformed',
  run(model) {
    const out = [];
    for (const f of model.files) for (const m of f.malformed) {
      out.push({ file: f.relPath, line: m.line,
        message: `malformed citation ${m.raw} — ${m.reason}`,
        hint: 'grammar: ^[path(:s-e)?(, path…)*] — see schema/spec.md' });
    }
    return out;
  },
};
