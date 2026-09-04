import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'citation-fs');
mkdirSync(join(FIXTURES_DIR, 'sources'), { recursive: true });
const fixture = join(FIXTURES_DIR, 'sources', 'real.md');
if (!existsSync(fixture)) writeFileSync(fixture, 'real\n'); // tracked file; write only if absent

const mk = (relPath, citations, malformed) => ({
  relPath, citations, malformed, fm: { ok: true, fields: {} }, links: [], paragraphs: [], body: '', bodyStartLine: 1, text: '',
});
const model = files => ({ files, config: { sourceDir: 'sources' }, vaultPath: FIXTURES_DIR });

test('citation.malformed passes through parser reasons with line numbers', () => {
  const r = RULES.find(x => x.id === 'citation.malformed');
  const fs = r.run(model([mk('notes/a.md', [], [{ raw: '^[a.md:9-1]', line: 12, reason: 'reversed line range in "a.md:9-1" (start > end)' }])]));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/a.md', 12]]);
});

test('citation.target-missing resolves against sourceDir; existing target passes', () => {
  const r = RULES.find(x => x.id === 'citation.target-missing');
  const fs = r.run(model([
    mk('notes/ok.md', [{ raw: 'x', line: 5, sources: [{ path: 'sources/real.md', start: null, end: null }] }], []),
    mk('notes/bad.md', [{ raw: 'x', line: 7, sources: [{ path: 'sources/ghost.md', start: null, end: null }] }], []),
  ]));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/bad.md', 7]]);
});
