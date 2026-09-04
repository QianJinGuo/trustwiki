import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';
import { parseFrontmatter } from '../cli/frontmatter.js';

const get = id => RULES.find(r => r.id === id);
const file = (text, relPath = 'notes/x.md') => {
  const fm = parseFrontmatter(text);
  return { relPath, text, fm, body: fm.body, bodyStartLine: fm.bodyStartLine, links: [], citations: [], malformed: [], paragraphs: [] };
};
const model = files => ({ config: { sourceDir: 'sources' }, files });

test('frontmatter.required fires once per file without fm', () => {
  const r = get('frontmatter.required');
  const fs = r.run(model([file('no fm here\n', 'notes/a.md'), file('---\ntitle: T\ncreated: 1\nupdated: 1\ntype: note\ntags: []\n---\nbody\n', 'notes/b.md')]));
  assert.deepEqual(fs.map(f => f.file), ['notes/a.md']);
});

test('frontmatter.fields lists each missing required field', () => {
  const r = get('frontmatter.fields');
  const fs = r.run(model([file('---\ntitle: T\n---\nbody\n', 'notes/a.md')]));
  const fields = fs.map(f => f.message).join(' ');
  for (const need of ['created', 'updated', 'type', 'tags']) assert.match(fields, new RegExp(need));
  assert.ok(fs.every(f => f.file === 'notes/a.md'));
});

test('sources pages additionally require source_url/ingested/sha256', () => {
  const r = get('frontmatter.fields');
  const fs = r.run(model([file('---\ntitle: T\ncreated: 1\nupdated: 1\ntype: source\ntags: []\n---\nbody\n', 'sources/a.md')]));
  const fields = fs.map(f => f.message).join(' ');
  for (const need of ['source_url', 'ingested', 'sha256']) assert.match(fields, new RegExp(need));
});

test('placeholder.present flags TODO with correct body line number', () => {
  const r = get('placeholder.present');
  const fs = r.run(model([file('---\ntitle: T\ncreated: 1\nupdated: 1\ntype: note\ntags: []\n---\n\nTODO: finish\n', 'notes/a.md')]));
  assert.deepEqual(fs.map(f => f.line), [9]); // body starts at file line 9; TODO is the first body line
});
