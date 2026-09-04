import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig } from '../cli/config.js';
import { parseCitation } from '../cli/citations.js';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function makeVault(files) {
  const dir = await mkdtemp(join(tmpdir(), 'tw-fix-'));
  for (const [p, content] of Object.entries(files)) {
    await mkdir(join(dir, p, '..'), { recursive: true });
    await writeFile(join(dir, p), content);
  }
  const { config } = await loadConfig(dir);
  return { dir, config };
}

const rulesOf = findings => new Set(findings.map(f => f.rule));

test('CRLF files parse and line numbers survive', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\r\ntitle: A\r\ncreated: 2026-09-05\r\nupdated: 2026-09-05\r\ntype: note\r\ntags: [x]\r\n---\r\n\r\nClaim one.^[sources/s.md]\r\n\r\nUncited prose paragraph here.\r\n',
    'sources/s.md': '---\r\ntitle: S\r\ncreated: 2026-09-05\r\nupdated: 2026-09-05\r\ntype: source\r\ntags: [x]\r\nsource_url: https://e.com\r\ningested: 2026-09-05\r\nsha256: 0000000000000000000000000000000000000000000000000000000000000000\r\n---\r\n\r\nbody\r\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!rulesOf(findings).has('frontmatter.required'), 'CRLF frontmatter must parse');
  assert.ok(rulesOf(findings).has('provenance.excess-inferred'));
  const inf = findings.find(f => f.rule === 'provenance.excess-inferred');
  assert.equal(inf.line, 11); // absolute file line of the uncited paragraph
  await rm(dir, { recursive: true, force: true });
});

test('citations and links inside fenced code are ignored', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nReal claim.^[sources/s.md]\n\n```\nfake ^[sources/ghost.md] and [[notes/nowhere]]\n```\n',
    'sources/s.md': '---\ntitle: S\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-09-05\nsha256: 0000000000000000000000000000000000000000000000000000000000000000\n---\n\nbody\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'citation.target-missing'));
  assert.ok(!findings.some(f => f.rule === 'link.broken'));
  await rm(dir, { recursive: true, force: true });
});

test('wikilink anchors ([[page#Section]]) resolve to the page', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nSee [[notes/b#Section Two]].\n',
    'notes/b.md': '---\ntitle: B\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nBody.\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'link.broken'));
  await rm(dir, { recursive: true, force: true });
});

test('citation path traversal cannot escape the vault', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nEscape attempt.^[../../../etc/passwd]\n',
  });
  const findings = await lintVault(dir, config);
  assert.ok(rulesOf(findings).has('citation.target-missing'), 'must be flagged missing, not read');
  await rm(dir, { recursive: true, force: true });
});

test('dangling index entries are flagged at their index line', async () => {
  const { dir, config } = await makeVault({
    '.trustwiki.json': '{ "index": "index.md", "roots": ["notes"] }',
    'index.md': '# Index\n\n- [[notes/real]]\n- [[notes/ghost]]\n',
    'notes/real.md': '---\ntitle: R\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\n[[notes/real]] body.\n',
  });
  const findings = await lintVault(dir, config);
  const ghost = findings.filter(f => f.message.includes('does not resolve'));
  assert.deepEqual(ghost.map(f => [f.file, f.line]), [['index.md', 4]]);
  await rm(dir, { recursive: true, force: true });
});

test('contradiction target sets must agree', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\ncontradicted_by: [notes/c]\n---\n\nClaim.\n\n> [!contradiction] see [[notes/b]]\n',
    'notes/b.md': '---\ntitle: B\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nOther claim.\n',
    'notes/c.md': '---\ntitle: C\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nThird claim.\n',
  });
  const findings = await lintVault(dir, config);
  const mismatch = findings.find(f => f.message.includes('target sets differ'));
  assert.ok(mismatch, 'callout says b, frontmatter says c — must be flagged');
  await rm(dir, { recursive: true, force: true });
});

test('frontmatter value validation: bad provenance_state, confidence, sha256', async () => {
  const { dir, config } = await makeVault({
    'notes/a.md': '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\nprovenance_state: bogus\nconfidence: 7\n---\n\nBody.\n',
    'sources/s.md': '---\ntitle: S\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: source\ntags: [x]\nsource_url: https://e.com\ningested: 2026-09-05\nsha256: short\n---\n\nbody\n',
  });
  const findings = await lintVault(dir, config);
  const msgs = findings.filter(f => f.rule === 'frontmatter.fields').map(f => f.message).join(' | ');
  assert.match(msgs, /provenance_state/);
  assert.match(msgs, /confidence/);
  assert.match(msgs, /sha256/);
  await rm(dir, { recursive: true, force: true });
});

test('bin: --config without value and unknown flags exit 2', async () => {
  const { execFileSync } = await import('node:child_process');
  const bin = new URL('../cli/bin.js', import.meta.url).pathname;
  for (const argv of [['lint', 'x', '--config'], ['lint', 'x', '--wat']]) {
    let status = 0;
    try { execFileSync('node', [bin, ...argv], { encoding: 'utf8' }); }
    catch (e) { status = e.status; }
    assert.equal(status, 2, argv.join(' '));
  }
});

test('zero line ranges are malformed', () => {
  assert.match(parseCitation('a.md:0-5').reason, /positive/);
});
