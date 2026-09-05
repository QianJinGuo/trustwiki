import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig } from '../cli/config.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// v0.2 — provenance.stale-claim: half-life annotation for cited claims.
// asOf pinned so age math is deterministic.

async function makeVault(files, configJson) {
  const dir = await mkdtemp(join(tmpdir(), 'tw-stale-'));
  for (const [p, content] of Object.entries(files)) {
    await mkdir(join(dir, p, '..'), { recursive: true });
    await writeFile(join(dir, p), content);
  }
  if (configJson) await writeFile(join(dir, '.trustwiki.json'), configJson);
  const { config, error } = await loadConfig(dir);
  if (error) throw new Error(error.message);
  return { dir, config };
}
const staleFindings = fs => fs.filter(f => f.rule === 'provenance.stale-claim');

const SRC_META = 'claim_class: model-generation\ningested: 2026-06-08\n';
const AS_OF = { asOf: '2026-09-05' }; // 2026-06-08 → 89 days old; half-life 59d

test('stale claim: old classified source triggers warn with age and half-life', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': JSON.stringify({ roots: ['notes', 'sources'], sourceDir: 'sources', ...AS_OF }),
    'sources/bench.md': `---\ntitle: Bench\ncreated: 2026-06-08\nupdated: 2026-06-08\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-06-08\nsha256: ${'0'.repeat(64)}\n${SRC_META}---\n\nBenchmark numbers from the wild.\n`,
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nThe benchmark holds at scale.^[sources/bench.md]\n',
  });
  const findings = await lintVault(dir, config);
  const stale = staleFindings(findings);
  assert.equal(stale.length, 1);
  assert.match(stale[0].message, /89d/);
  assert.match(stale[0].message, /half-life 59d/);
  assert.equal(stale[0].severity, 'warn');
  await rm(dir, { recursive: true, force: true });
});

test('fresh source (within half-life) does not fire', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': JSON.stringify({ roots: ['notes', 'sources'], sourceDir: 'sources', ...AS_OF }),
    'sources/bench.md': `---\ntitle: Bench\ncreated: 2026-08-20\nupdated: 2026-08-20\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-08-20\nsha256: ${'0'.repeat(64)}\nclaim_class: model-generation\n---\n\nFresh benchmark numbers.\n`,
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nThe benchmark holds.^[sources/bench.md]\n',
  });
  const findings = await lintVault(dir, config);
  assert.equal(staleFindings(findings).length, 0, '16 days old < 59d half-life');
  await rm(dir, { recursive: true, force: true });
});

test('unclassified sources are skipped — the rule never guesses', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': JSON.stringify({ roots: ['notes', 'sources'], sourceDir: 'sources', ...AS_OF }),
    'sources/old.md': `---\ntitle: Old\ncreated: 2025-01-01\nupdated: 2025-01-01\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2025-01-01\nsha256: ${'0'.repeat(64)}\n---\n\nAncient claims, but unclassified.\n`,
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nCites the ancient source.^[sources/old.md]\n',
  });
  const findings = await lintVault(dir, config);
  assert.equal(staleFindings(findings).length, 0);
  await rm(dir, { recursive: true, force: true });
});

test('halflife_days overrides claim_class; oldest cited source governs', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': JSON.stringify({ roots: ['notes', 'sources'], sourceDir: 'sources', ...AS_OF }),
    'sources/newer.md': `---\ntitle: Newer\ncreated: 2026-09-01\nupdated: 2026-09-01\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-09-01\nsha256: ${'0'.repeat(64)}\nclaim_class: model-generation\n---\n\nFresh.\n`,
    'sources/ancient.md': `---\ntitle: Ancient\ncreated: 2026-01-01\nupdated: 2026-01-01\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-01-01\nsha256: ${'0'.repeat(64)}\nhalflife_days: 30\n---\n\nAncient but directly annotated.\n`,
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nCites both — oldest governs.^[sources/newer.md, sources/ancient.md]\n',
  });
  const findings = await lintVault(dir, config);
  const stale = staleFindings(findings);
  assert.equal(stale.length, 1);
  assert.match(stale[0].message, /ancient\.md/);
  assert.match(stale[0].message, /held 247d .*half-life 30d/);
  await rm(dir, { recursive: true, force: true });
});
