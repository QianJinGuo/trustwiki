export const rule = {
  id: 'page.orphan',
  run(model) {
    const out = [];
    const srcDir = model.config.sourceDir;
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      // raw/source pages quote their source — outbound links are not their job
      const isSource = (model.config.inferredSkipTypes || []).includes(f.fm.fields.type)
        || (srcDir && f.relPath.startsWith(`${srcDir}/`));
      if (isSource) continue;
      const n = f.links.length;
      if (n < model.config.minOutboundLinks) out.push({ file: f.relPath, line: 1,
        message: `only ${n} outbound link(s) — orphaned page`,
        hint: `weave in at least ${model.config.minOutboundLinks} related pages` });
    }
    return out;
  },
};
