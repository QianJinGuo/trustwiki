export const rule = {
  id: 'frontmatter.required',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) out.push({ file: f.relPath, line: 1,
        message: 'missing or unreadable YAML frontmatter',
        hint: 'add a --- block with title/created/updated/type/tags' });
    }
    return out;
  },
};
