export const rule = {
  id: 'link.index-missing', needs: 'index',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const norm = f.relPath.replace(/\.md$/, '');
      let listed = model.indexEntries.has(norm);
      if (!listed) {
        const base = norm.split('/').pop();
        listed = [...model.indexEntries].some(e => e.endsWith(`/${base}`) || e === base);
      }
      if (!listed) out.push({ file: f.relPath, line: 1,
        message: 'missing from index',
        hint: `add an entry to ${model.config.index}` });
    }
    return out;
  },
};
