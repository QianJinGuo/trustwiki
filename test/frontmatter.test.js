import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, parseList } from '../cli/frontmatter.js';

test('flat keys, inline list, body split with correct bodyStartLine', () => {
  const text = '---\ntitle: Tea\ntags: [a, b]\n---\n\n# Body line 7\n';
  const r = parseFrontmatter(text);
  assert.equal(r.ok, true);
  assert.equal(r.fields.title, 'Tea');
  assert.deepEqual(parseList(r.fields.tags), ['a', 'b']);
  assert.equal(r.bodyStartLine, 5); // 1:--- 2:title 3:tags 4:--- 5:blank(body starts here)
  assert.match(r.body, /# Body line 7/);
});

test('multiline block scalar accumulates indented lines', () => {
  const text = '---\ndescription: |-\n  line one\n  line two\n---\nbody\n';
  const r = parseFrontmatter(text);
  assert.equal(r.fields.description, 'line one line two');
});

test('no frontmatter → ok:false, whole text is body', () => {
  const r = parseFrontmatter('just text\n');
  assert.equal(r.ok, false);
  assert.equal(r.body, 'just text\n');
  assert.equal(r.bodyStartLine, 1);
});

test('unterminated frontmatter → ok:false', () => {
  const r = parseFrontmatter('---\ntitle: x\n');
  assert.equal(r.ok, false);
});
