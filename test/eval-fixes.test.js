import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig } from '../cli/config.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Evaluation round 1 (2026-09-05) found: page.orphan and provenance.excess-inferred
// fired on raw source pages. Exemptions must be location-based (sourceDir),
// not just label-based (type field) — raw pages often lack the `source` label.

test('source pages under sourceDir are exempt from orphan and inferred rules even without type label', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': '{ "roots": ["notes", "raw"], "sourceDir": "raw" }',
    'notes/linking.md': '---\ntitle: Linking\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nCited claim.^[raw/captured.md]\n\nSecond cited paragraph.^[raw/captured.md]\nSource: [[raw/captured]]\n',
    'raw/captured.md': '---\ntitle: Captured\nsource_url: https://e.com\n---\n\nVerbatim source words with no outbound links and no citations.\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'page.orphan' && f.file === 'raw/captured.md'),
    'raw page under sourceDir must not be flagged orphan');
  assert.ok(!findings.some(f => f.rule === 'provenance.excess-inferred' && f.file === 'raw/captured.md'),
    'raw page under sourceDir must not be flagged excess-inferred');
  await rm(dir, { recursive: true, force: true });
});

async function makeVault(files) {
  const dir = await mkdtemp(join(tmpdir(), 'tw-eval-'));
  for (const [p, content] of Object.entries(files)) {
    await mkdir(join(dir, p, '..'), { recursive: true });
    await writeFile(join(dir, p), content);
  }
  const { config } = await loadConfig(dir);
  return { dir, config };
}
