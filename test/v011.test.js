import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig } from '../cli/config.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function makeVault(files, configJson) {
  const dir = await mkdtemp(join(tmpdir(), 'tw-v011-'));
  for (const [p, content] of Object.entries(files)) {
    await mkdir(join(dir, p, '..'), { recursive: true });
    await writeFile(join(dir, p), content);
  }
  if (configJson) await writeFile(join(dir, '.trustwiki.json'), configJson);
  const { config } = await loadConfig(dir);
  return { dir, config };
}
const rulesOf = fs => new Set(fs.map(f => f.rule));

test('v011-1: [[label]](url) reference-style links are not wikilinks', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nSee the [[2]](/docs/architecture) overview and [[12]](https://example.com/x).\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'link.broken'),
    JSON.stringify(findings.map(f => f.rule + ':' + f.message)));
  await rm(dir, { recursive: true, force: true });
});

test('v011-2: regex literals inside inline HTML tags are not citations', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': "---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nUse <tt>e.value.matches('^[a-zA-Z]*$')</tt> in CEL, as <code>^[0-9]+$</code> shows.\n",
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'citation.malformed'),
    JSON.stringify(findings.map(f => f.rule + ':' + f.message)));
  assert.ok(!findings.some(f => f.rule === 'citation.target-missing'),
    JSON.stringify(findings.map(f => f.rule + ':' + f.message)));
  await rm(dir, { recursive: true, force: true });
});

test('v011-3: placeholder rule does not fire on domain terms (allowlist vocabulary)', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nA To-do list entity is derived from the TodoListEntity class and supports ordered todo items.\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'placeholder.present'),
    JSON.stringify(findings.map(f => f.rule + ':' + f.message)));
  await rm(dir, { recursive: true, force: true });
});

test('v011-3b: real TODO placeholders still fire', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nTODO: finish this section properly.\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(findings.some(f => f.rule === 'placeholder.present'));
  await rm(dir, { recursive: true, force: true });
});
