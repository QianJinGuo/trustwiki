import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SKIP = new Set(['.git', 'node_modules']);

export async function walkVault(root, roots, indexFile = null) {
  const out = [];
  async function rec(rel) {
    const abs = join(root, rel);
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
      const relChild = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await rec(relChild);
      else if (entry.name.endsWith('.md') && relChild !== indexFile) out.push(relChild);
    }
  }
  for (const r of roots.length ? roots : ['.']) await rec(r === '.' ? '' : r);
  return out.sort();
}
