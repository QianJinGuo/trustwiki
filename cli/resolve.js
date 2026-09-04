import { existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export function normalizeTarget(t) { return t.trim().replace(/\.md$/, ''); }

export function resolveTarget(t, cfg) {
  const cands = [t, `${t}.md`];
  if (cfg.sourceDir) cands.push(`${cfg.sourceDir}/${t}`, `${cfg.sourceDir}/${t}.md`);
  for (const root of cfg.roots || []) {
    if (!root || root === '.') continue;
    cands.push(`${root}/${t}`, `${root}/${t}.md`);
  }
  return cands;
}

// Contained, regular-file existence check. Rejects `../` escapes, symlink
// escapes, and directory hits — a citation/probe must never leave the vault.
export function resolveInVault(vaultPath, cand) {
  const vaultRoot = resolve(vaultPath);
  const abs = resolve(vaultRoot, cand);
  if (abs !== vaultRoot && !abs.startsWith(vaultRoot + sep)) return null;
  if (!existsSync(abs)) return null;
  try { if (!statSync(abs).isFile()) return null; } catch { return null; }
  return abs;
}
