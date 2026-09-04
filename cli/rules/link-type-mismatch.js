export const rule = {
  id: 'link.type-mismatch',
  run(model) {
    const out = [];
    if (!Object.keys(model.config.typeByDir).length) return out; // no-op by design
    for (const f of model.files) {
      const topDir = f.relPath.split('/')[0];
      const want = model.config.typeByDir[topDir];
      const got = f.fm.ok ? f.fm.fields.type : undefined;
      if (want && got && got !== want) out.push({ file: f.relPath, line: 1,
        message: `type "${got}" does not match directory type "${want}"`,
        hint: `set type: ${want} or move the page` });
    }
    return out;
  },
};
