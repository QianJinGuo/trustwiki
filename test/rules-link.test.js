import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';

const mkFile = (relPath, fmOk, links, opts = {}) => ({
  relPath, fm: { ok: fmOk, fields: opts.fields || {} }, body: opts.body || '', bodyStartLine: opts.bodyStartLine || 1,
  links, citations: [], malformed: [], paragraphs: [], text: '',
});
const model = (files, cfg = {}) => ({
  files,
  config: { minOutboundLinks: 2, index: 'index.md', sourceDir: 'sources', typeByDir: { notes: 'note' }, ...cfg },
  indexEntries: new Set(['notes/a']),
  indexLines: new Map(),
  filePaths: new Set(files.map(f => f.relPath)),
});

test('link.broken: basename match resolves, otherwise finding', () => {
  const r = RULES.find(x => x.id === 'link.broken');
  const files = [
    mkFile('notes/a.md', true, [{ target: 'notes/a', alias: null, line: 3 }]),
    mkFile('notes/b.md', true, [{ target: 'notes/zzz', alias: null, line: 4 }]),
  ];
  const fs = r.run(model(files));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/b.md', 4]]);
  assert.match(fs[0].hint, /create|fix/i);
});

test('link.index-missing fires per file absent from index; needs index', () => {
  const r = RULES.find(x => x.id === 'link.index-missing');
  assert.equal(r.needs, 'index');
  const fs = r.run(model([mkFile('notes/a.md', true, []), mkFile('notes/b.md', true, [])]));
  assert.deepEqual(fs.map(f => f.file), ['notes/b.md']);
});

test('link.type-mismatch no-ops without typeByDir, checks dir→type when configured', () => {
  const r = RULES.find(x => x.id === 'link.type-mismatch');
  const files = [mkFile('notes/wrong.md', true, [], { fields: { type: 'moc' } })];
  assert.deepEqual(r.run(model(files, { typeByDir: {} })), []);
  const fs = r.run(model(files));
  assert.ok(fs[0].message.includes('moc'));
});

test('page.orphan: fewer than minOutboundLinks outbound wikilinks', () => {
  const r = RULES.find(x => x.id === 'page.orphan');
  const fs = r.run(model([
    mkFile('notes/lonely.md', true, [{ target: 'notes/a', alias: null, line: 2 }]),
    mkFile('notes/social.md', true, [{ target: 'notes/a', alias: null, line: 2 }, { target: 'notes/b', alias: null, line: 3 }]),
  ]));
  assert.deepEqual(fs.map(f => f.file), ['notes/lonely.md']);
});
