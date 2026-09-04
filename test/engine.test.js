import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig } from '../cli/config.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('degradation: index rules skip when index unset (no crash, no index findings)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  await mkdir(join(dir, 'notes'), { recursive: true });
  await writeFile(join(dir, 'notes/a.md'), '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nBody. Body.\n');
  const { config } = await loadConfig(dir);
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'link.index-missing'));
  await rm(dir, { recursive: true, force: true });
});
