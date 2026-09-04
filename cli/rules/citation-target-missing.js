import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTarget } from '../engine.js';

export const rule = {
  id: 'citation.target-missing',
  run(model) {
    const out = [];
    for (const f of model.files) for (const c of f.citations) {
      for (const s of c.sources) {
        const hits = resolveTarget(s.path, model.config)
          .map(cand => join(model.vaultPath, cand))
          .filter(existsSync);
        if (!hits.length) out.push({ file: f.relPath, line: c.line,
          message: `citation target not found: ${s.path}`,
          hint: model.config.sourceDir
            ? `create under ${model.config.sourceDir}/ or fix the path`
            : 'create the source file or fix the path' });
      }
    }
    return out;
  },
};
