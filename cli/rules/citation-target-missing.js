import { resolveInVault, resolveTarget } from '../resolve.js';

export const rule = {
  id: 'citation.target-missing',
  run(model) {
    const out = [];
    for (const f of model.files) for (const c of f.citations) {
      for (const s of c.sources) {
        const hit = resolveTarget(s.path, model.config)
          .map(cand => resolveInVault(model.vaultPath, cand))
          .find(Boolean);
        if (!hit) out.push({ file: f.relPath, line: c.line,
          message: `citation target not found: ${s.path}`,
          hint: model.config.sourceDir
            ? `create under ${model.config.sourceDir}/ or fix the path`
            : 'create the source file or fix the path' });
      }
    }
    return out;
  },
};
