function resolvesTo(model, pageTarget) {
  const norm = pageTarget.replace(/\.md$/, '');
  if (model.filePaths.has(`${norm}.md`)) return true;
  const base = `${norm.split('/').pop()}.md`;
  const hits = [...model.filePaths].filter(p => p.endsWith(`/${base}`) || p === base);
  return hits.length === 1;
}

export const rule = {
  id: 'link.broken',
  run(model) {
    const out = [];
    for (const f of model.files) for (const l of f.links) {
      const pageTarget = l.target.split('#')[0]; // [[page#Section]] → page
      if (!pageTarget) continue; // pure-anchor link: nothing to resolve here
      if (!resolvesTo(model, pageTarget)) out.push({ file: f.relPath, line: l.line,
        message: `broken wikilink [[${l.target}]]`,
        hint: 'fix the path or create the target page' });
    }
    return out;
  },
};
