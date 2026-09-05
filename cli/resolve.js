import { existsSync, statSync, realpathSync } from 'node:fs';
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

// Contained, regular-file existence check. Realpath-based: an in-vault symlink
// pointing outside the vault resolves outside and is rejected. Rejects `../`
// escapes and directory hits — a citation/probe must never leave the vault.
export function resolveInVault(vaultPath, cand) {
  const abs = resolve(vaultPath, cand);
  if (!existsSync(abs)) return null;
  let rp, rootReal;
  try {
    rp = realpathSync(abs);
    rootReal = realpathSync(vaultPath);
  } catch {
    return null;
  }
  if (rp !== rootReal && !rp.startsWith(rootReal + sep)) return null;
  try { if (!statSync(rp).isFile()) return null; } catch { return null; }
  return rp;
}
