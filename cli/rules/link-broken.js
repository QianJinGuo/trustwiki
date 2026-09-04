import { resolveTarget } from '../engine.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function resolvesTo(model, target) {
  const norm = target.replace(/\.md$/, '');
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
      if (!resolvesTo(model, l.target)) out.push({ file: f.relPath, line: l.line,
        message: `broken wikilink [[${l.target}]]`,
        hint: 'fix the path or create the target page' });
    }
    return out;
  },
};
