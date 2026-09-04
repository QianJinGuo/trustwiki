import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';

const mk = (relPath, { fields = {}, paragraphs = [], body = '', citations = [] } = {}) =>
  ({ relPath, fm: { ok: true, fields }, paragraphs, body, links: [], citations, malformed: [], text: '', bodyStartLine: 1 });
const model = (files, cfg = {}) => ({ files, config: { inferredThreshold: 0.3, confidenceFloor: 0.5, inferredSkipTypes: ['source'], ...cfg } });

test('excess-inferred: >threshold uncited prose, skips source type, first uncited line', () => {
  const r = RULES.find(x => x.id === 'provenance.excess-inferred');
  const ps = [
    { text: 'cited', startLine: 10, isProse: true },
    { text: 'uncited one', startLine: 14, isProse: true },
    { text: 'uncited two', startLine: 16, isProse: true },
  ];
  const fs = r.run(model([
    mk('notes/a.md', { paragraphs: ps, fields: { type: 'note' }, citations: [{ line: 10, sources: [{ path: 's.md', start: null, end: null }] }] }),
    mk('sources/b.md', { paragraphs: ps, fields: { type: 'source' } }),
  ]));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/a.md', 14]]);
});

test('low-confidence: confidence below floor reports value; file-scope line 1', () => {
  const r = RULES.find(x => x.id === 'provenance.low-confidence');
  const fs = r.run(model([mk('notes/a.md', { fields: { confidence: '0.3' } }), mk('notes/b.md', { fields: { confidence: '0.8' } })]));
  assert.deepEqual(fs.map(f => f.file), ['notes/a.md']);
  assert.match(fs[0].message, /0\.3/);
  assert.equal(fs[0].line, 1); // R3: file-scope findings use line 1
});

test('contradicted: callout without contradicted_by AND list without callout both flagged', () => {
  const r = RULES.find(x => x.id === 'provenance.contradicted');
  const files = [
    mk('notes/a.md', { body: 'x\n\n> [!contradiction] see [[notes/b]]\n' }),
    mk('notes/b.md', { fields: { contradicted_by: '[notes/a]' }, body: 'quiet\n' }),
  ];
  const fs = r.run(model(files));
  assert.deepEqual(fs.map(f => f.file).sort(), ['notes/a.md', 'notes/b.md']);
});
