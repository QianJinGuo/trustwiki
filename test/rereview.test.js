import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig, RULE_IDS } from '../cli/config.js';
import { parseCitation } from '../cli/citations.js';
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function makeVault(files, configJson) {
  const dir = await mkdtemp(join(tmpdir(), 'tw-rr-'));
  for (const [p, content] of Object.entries(files)) {
    await mkdir(join(dir, p, '..'), { recursive: true });
    await writeFile(join(dir, p), content);
  }
  if (configJson) await writeFile(join(dir, '.trustwiki.json'), configJson);
  const { config, error } = await loadConfig(dir);
  if (error) throw new Error(error.message);
  return { dir, config };
}
const rulesOf = fs => new Set(fs.map(f => f.rule));

test('re-1: in-vault symlink escaping the vault is flagged target-missing (realpath containment)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-outside-'));
  await writeFile(join(dir, 'secret.md'), 'SECRET\n');
  const { dir: vault, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nLeak.^[leak.md]\n',
  });
  await symlink(join(dir, 'secret.md'), join(vault, 'leak.md'));
  const findings = await lintVault(vault, config);
  assert.ok(findings.some(f => f.rule === 'citation.target-missing'), 'symlinked target outside vault must not resolve');
  await rm(dir, { recursive: true, force: true });
  await rm(vault, { recursive: true, force: true });
});

test('re-3: nested/colon ranges are malformed', () => {
  assert.match(parseCitation('a.md:1-2:3-4').reason, /bad source/i);
});

test('re-4a: mixed fence delimiters — ``` inside ~~~ stays masked, content after ~~~ closes', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nReal.^[sources/s.md]\n\n~~~\nfake ^[sources/ghost1.md]\n```\nnested-look ^[sources/ghost2.md]\n~~~\n',
    'sources/s.md': '---\ntitle: S\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-09-05\nsha256: 0000000000000000000000000000000000000000000000000000000000000000\n---\n\nbody\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'citation.target-missing'), 'ghost1/ghost2 inside fences must not resolve');
  await rm(dir, { recursive: true, force: true });
});

test('re-4b: contradiction callouts inside code fences are ignored', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nClaim.\n\n```\n> [!contradiction] example in docs\n```\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'provenance.contradicted'));
  await rm(dir, { recursive: true, force: true });
});

test('re-A: anchored index entry [[page#Section]] resolves and is not dangling', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': '{ "index": "index.md", "roots": ["notes"] }',
    'index.md': '- [[notes/real#Section]]\n',
    'notes/real.md': '---\ntitle: R\ncreated: 1\nupdated: 1\ntype: note\ntags: [x]\n---\nbody\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'link.index-missing'),
    JSON.stringify(findings.map(f => f.rule + ':' + f.message)));
  await rm(dir, { recursive: true, force: true });
});

test('re-11: --config value that looks like a flag exits 2; missing explicit config exits 2', async () => {
  const { execFileSync } = await import('node:child_process');
  const bin = new URL('../cli/bin.js', import.meta.url).pathname;
  for (const argv of [['lint', 'x', '--config'], ['lint', 'x', '--config', '--json']]) {
    let status = 0;
    try { execFileSync('node', [bin, ...argv], { encoding: 'utf8' }); }
    catch (e) { status = e.status; }
    assert.equal(status, 2, argv.join(' '));
  }
  let status = 0, err = '';
  try { execFileSync('node', [bin, 'lint', 'x', '--config', '/nonexistent/tw.json'], { encoding: 'utf8' }); }
  catch (e) { status = e.status; err = e.stderr; }
  assert.equal(status, 2);
  assert.match(err, /not found/);
});

test('re-12: invalid calendar dates and bad ingested are flagged', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-02-30\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nBody.\n',
    'sources/s.md': '---\ntitle: S\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-13-01\nsha256: 0000000000000000000000000000000000000000000000000000000000000000\n---\n\nbody\n',
  });
  const findings = await lintVault(dir, config);
  const msgs = findings.filter(f => f.rule === 'frontmatter.fields').map(f => f.message).join(' | ');
  assert.match(msgs, /created is not a valid ISO date/);
  assert.match(msgs, /ingested is not a valid ISO date/);
  assert.ok(!msgs.includes('updated'), 'valid updated must not be flagged');
  await rm(dir, { recursive: true, force: true });
});

test('re-13: report strips CR and C1 controls from messages', async () => {
  const { formatText } = await import('../cli/report.js');
  const out = formatText([{ rule: 'x', severity: 'warn', file: 'a\u001b[31m.md\r\nFAKE LINE', line: 1, message: 'm\x1b]0;title', hint: '' }]);
  assert.ok(!/[\x00-\x1F\x7F-\x9F]/.test(out.replace(/\n/g, '')), out);
});

test('re-D: config.index-unreadable is a configurable rule id', () => {
  assert.ok(RULE_IDS.includes('config.index-unreadable'));
});

test('re-8: unreadable configured index produces a warn finding, not silence', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': '{ "index": "nope.md", "roots": ["notes"] }',
    'notes/a.md': '---\ntitle: A\ncreated: 1\nupdated: 1\ntype: note\ntags: [x]\n---\nbody\n',
  });
  const findings = await lintVault(dir, config);
  const w = findings.find(f => f.rule === 'config.index-unreadable');
  assert.ok(w && w.severity === 'warn');
  await rm(dir, { recursive: true, force: true });
});
