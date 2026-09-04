export const rule = {
  id: 'page.orphan',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      const n = f.links.length;
      if (n < model.config.minOutboundLinks) out.push({ file: f.relPath, line: 1,
        message: `only ${n} outbound link(s) — orphaned page`,
        hint: `weave in at least ${model.config.minOutboundLinks} related pages` });
    }
    return out;
  },
};
