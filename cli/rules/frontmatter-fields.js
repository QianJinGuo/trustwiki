const BASE = ['title', 'created', 'updated', 'type', 'tags'];
const SOURCE = ['source_url', 'ingested', 'sha256'];

export const rule = {
  id: 'frontmatter.fields',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      const isSource = f.fm.fields.type === 'source'
        || (model.config.sourceDir && f.relPath.startsWith(`${model.config.sourceDir}/`));
      const missing = [...BASE, ...(isSource ? SOURCE : [])].filter(k => !f.fm.fields[k]);
      if (missing.length) out.push({ file: f.relPath, line: 1,
        message: `missing frontmatter field(s): ${missing.join(', ')}`,
        hint: 'see schema/spec.md — Frontmatter' });
    }
    return out;
  },
};
