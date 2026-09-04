import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkVault } from '../cli/walk.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('walks roots, skips dotdirs/node_modules/non-md, honors index skip', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  for (const p of ['notes/a.md', 'notes/sub/b.md', 'sources/c.md', 'index.md',
                   'notes/d.txt', '.hidden/e.md', 'node_modules/x/y.md']) {
    await mkdir(join(dir, p, '..'), { recursive: true });
    await writeFile(join(dir, p), 'x\n');
  }
  const all = await walkVault(dir, ['.']);
  assert.deepEqual(all, ['index.md', 'notes/a.md', 'notes/sub/b.md', 'sources/c.md']);
  const rooted = await walkVault(dir, ['notes', 'sources']);
  assert.deepEqual(rooted, ['notes/a.md', 'notes/sub/b.md', 'sources/c.md']);
  const skipIndex = await walkVault(dir, ['.'], 'index.md');
  assert.deepEqual(skipIndex, ['notes/a.md', 'notes/sub/b.md', 'sources/c.md']);
  await rm(dir, { recursive: true, force: true });
});
