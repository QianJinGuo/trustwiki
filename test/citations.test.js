import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCitation, findCitations } from '../cli/citations.js';

test('single source, with and without .md', () => {
  assert.deepEqual(parseCitation('sources/tea.md'), { ok: true, sources: [{ path: 'sources/tea.md', start: null, end: null }] });
  assert.deepEqual(parseCitation('tea'), { ok: true, sources: [{ path: 'tea', start: null, end: null }] });
});

test('line range and anchor forms', () => {
  assert.deepEqual(parseCitation('sources/tea.md:42-58'), { ok: true, sources: [{ path: 'sources/tea.md', start: 42, end: 58 }] });
  assert.deepEqual(parseCitation('sources/tea.md#L42-L58'), { ok: true, sources: [{ path: 'sources/tea.md', start: 42, end: 58 }] });
});

test('multi-source list', () => {
  const r = parseCitation('sources/a.md, sources/b.md:3-4');
  assert.equal(r.ok, true);
  assert.equal(r.sources.length, 2);
  assert.deepEqual(r.sources[1], { path: 'sources/b.md', start: 3, end: 4 });
});

test('malformed: empty, reversed range, junk separator', () => {
  assert.match(parseCitation('').reason, /empty/i);
  assert.match(parseCitation('a.md:99-10').reason, /reversed/i);
  assert.match(parseCitation('a.md foo.md').reason, /bad source/i);
});

test('findCitations computes absolute lines and separates malformed', () => {
  const body = '# T\n\nCited.^[sources/tea.md:1-2]\n\nBad.^[a.md:9-1]\n';
  const r = findCitations(body, 5);
  assert.deepEqual(r.citations.map(c => c.line), [7]);
  assert.deepEqual(r.malformed.map(m => m.line), [9]);
});

// spec examples — every grammar example in schema/spec.md must parse
test('spec examples parse ok', () => {
  for (const raw of ['^[sources/tea.md]', '^[sources/tea.md:42-58]', '^[sources/a.md, sources/b.md#L3-L4]']) {
    const inner = raw.slice(2, -1);
    assert.equal(parseCitation(inner).ok, true, raw);
  }
});
