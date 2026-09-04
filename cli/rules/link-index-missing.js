function listedEntryResolves(model, norm) {
  if (model.filePaths.has(`${norm}.md`)) return true;
  const base = `${norm.split('/').pop()}.md`;
  const hits = [...model.filePaths].filter(p => p.endsWith(`/${base}`) || p === base);
  return hits.length === 1;
}

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
    for (const [norm, line] of model.indexLines) {
      if (!listedEntryResolves(model, norm)) out.push({ file: model.config.index, line,
        message: `index entry does not resolve: [[${norm}]]`,
        hint: 'fix the path or remove the entry' });
    }
    return out;
  },
};
