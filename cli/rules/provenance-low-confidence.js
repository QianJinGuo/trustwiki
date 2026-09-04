export const rule = {
  id: 'provenance.low-confidence',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const c = Number(f.fm?.ok ? f.fm.fields.confidence : NaN);
      if (!Number.isNaN(c) && c < model.config.confidenceFloor) {
        out.push({ file: f.relPath, line: 1,
          message: `confidence ${c} below floor ${model.config.confidenceFloor}`,
          hint: 'add sources to raise confidence, or archive the page' });
      }
    }
    return out;
  },
};
