import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractWikilinks } from '../cli/links.js';

test('extracts targets, aliases, and correct absolute line numbers', () => {
  const body = '# T\n\nSee [[notes/a]] and [[notes/b|the B]].\nNot a link.\n';
  const links = extractWikilinks(body, 5);
  assert.deepEqual(links, [
    { target: 'notes/a', alias: null, line: 7 },
    { target: 'notes/b', alias: 'the B', line: 7 },
  ]);
});
