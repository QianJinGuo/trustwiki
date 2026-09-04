import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, DEFAULT_CONFIG, RULE_IDS } from '../cli/config.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('defaults when no config file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  const { config, error } = await loadConfig(dir);
  assert.equal(error, undefined);
  assert.deepEqual(config.roots, ['.']);
  assert.equal(config.index, null);
  assert.equal(config.rules['link.broken'], 'error');
  assert.equal(Object.keys(config.rules).length, RULE_IDS.length);
  await rm(dir, { recursive: true, force: true });
});

test('merges user config and rejects unknown rule id with error', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  await writeFile(join(dir, '.trustwiki.json'), JSON.stringify({
    roots: ['notes'], index: 'index.md', rules: { 'link.broken': 'off', 'nope.rule': 'warn' }
  }));
  const bad = await loadConfig(dir);
  assert.match(bad.error.message, /unknown rule/i);
  await writeFile(join(dir, '.trustwiki.json'), JSON.stringify({
    roots: ['notes'], index: 'index.md', sourceDir: 'sources', rules: { 'link.broken': 'off' }
  }));
  const { config, error } = await loadConfig(dir);
  assert.equal(error, undefined);
  assert.deepEqual(config.roots, ['notes']);
  assert.equal(config.rules['link.broken'], 'off');
  assert.equal(config.rules['frontmatter.required'], 'error'); // default kept
  await rm(dir, { recursive: true, force: true });
});

test('invalid JSON → error exit-2 shape', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  await writeFile(join(dir, '.trustwiki.json'), '{oops');
  const { error } = await loadConfig(dir);
  assert.match(error.message, /\.trustwiki\.json/);
  await rm(dir, { recursive: true, force: true });
});
