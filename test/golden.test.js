import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../cli/config.js';
import { lintVault } from '../cli/engine.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'demo-vault');

test('golden: demo-vault produces exactly these findings', async () => {
  const { config } = await loadConfig(dir);
  const findings = await lintVault(dir, config);
  const actual = findings.map(f => `${f.rule}:${f.file}:${f.line}`).sort();
  assert.deepEqual(actual, [
    'citation.malformed:notes/sloppy-page.md:20',
    'citation.target-missing:notes/sloppy-page.md:12',
    'link.broken:notes/sloppy-page.md:18',
    'placeholder.present:notes/sloppy-page.md:16',
    'provenance.contradicted:notes/conflict-a.md:13',
    'provenance.contradicted:notes/conflict-b.md:1',
    'provenance.excess-inferred:notes/sloppy-page.md:14',
    'provenance.low-confidence:notes/sloppy-page.md:1',
    'provenance.stale-claim:notes/benchmarks.md:9',
  ]);
});
