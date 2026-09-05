# trustwiki Core Implementation Plan (M1–M4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `npx trustwiki lint ./vault` — a zero-dependency provenance linter for agent-maintained markdown knowledge bases — plus the SKILL.md method, open schema spec, templates, and launch pack.

**Architecture:** Single ESM CLI package. Config-driven rule pipeline (`.trustwiki.json`), each rule a module emitting findings `{rule, severity, file, line, message, hint}`. demo-vault fixture doubles as golden test and GIF script. Generalized from `wiki/scripts/wiki-lint.mjs` (599 lines) with a migration-parity harness as the acceptance gate.

**Tech Stack:** Node ≥18, ESM, `node:test` built-in runner, **zero runtime dependencies**. Dev tooling: `vhs` (GIF, optional, not a dependency).

**Spec:** `docs/2026-09-05-trustwiki-design.md` (decisions locked: `trustwiki` name, CLI-first + SKILL.md parallel, EN-first + zh full).

## Global Constraints

- Zero runtime dependencies in `package.json`; dev/test uses only Node built-ins.
- Exit codes: 0 = no errors, 1 = ≥1 error (warnings never affect exit), 2 = config/usage error.
- Citation grammar frozen at `trustwiki-schema v0.1` (spec §3.2) — parsers must implement exactly that grammar.
- Graceful degradation: index rules skip (with report notice) when `index` unset; `citation.target-missing` falls back to roots-relative resolution when `sourceDir` unset.
- EN-first copy + zh full mirrors (`*.zh.md`); every number in README/STATS carries source + verification date.
- Private wiki content never enters this repo; parity harness reads the private wiki from env `TRUSTWIKI_PARITY_VAULT`.
- Every task ends with `git commit`. Test command: `node --test test/` (runs all).

---

### Task 1: Package scaffold + config loader

**Files:**
- Create: `package.json`, `cli/config.js`, `.gitignore`
- Test: `test/config.test.js`

**Interfaces:**
- Produces: `loadConfig(vaultPath, explicitConfigPath?) → Promise<{config}|{error:{message}}>` where `config = {vaultPath, roots:string[], index:string|null, sourceDir:string|null, rules:Record<string,'error'|'warn'|'off'>, typeByDir:Record<string,string>, minOutboundLinks:number, inferredThreshold:number, confidenceFloor:number, inferredSkipTypes:string[]}`.

- [ ] **Step 1: Write the failing test**

```js
// test/config.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL — Cannot find module `../cli/config.js`

- [ ] **Step 3: Write minimal implementation**

```jsonc
// package.json
{
  "name": "trustwiki",
  "version": "0.1.0-alpha.0",
  "description": "Provenance linter and method for agent-maintained knowledge bases — every claim cited, contradictions surfaced, rot detected.",
  "type": "module",
  "bin": { "trustwiki": "cli/bin.js" },
  "engines": { "node": ">=18" },
  "scripts": { "test": "node --test test/" },
  "license": "MIT",
  "repository": "github:QianJinGuo/trustwiki"
}
```

```
# .gitignore
node_modules/
```

```js
// cli/config.js
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const RULE_IDS = [
  'frontmatter.required', 'frontmatter.fields', 'placeholder.present',
  'link.broken', 'link.index-missing', 'link.type-mismatch', 'page.orphan',
  'citation.malformed', 'citation.target-missing',
  'provenance.excess-inferred', 'provenance.low-confidence', 'provenance.contradicted',
];

export const DEFAULT_CONFIG = {
  roots: ['.'],
  index: null,
  sourceDir: null,
  typeByDir: {},
  minOutboundLinks: 2,
  inferredThreshold: 0.3,
  confidenceFloor: 0.5,
  inferredSkipTypes: ['source'],
  rules: Object.fromEntries(RULE_IDS.map(id => [id,
    { 'frontmatter.required':'error','frontmatter.fields':'error','placeholder.present':'warn',
      'link.broken':'error','link.index-missing':'warn','link.type-mismatch':'warn','page.orphan':'warn',
      'citation.malformed':'error','citation.target-missing':'error',
      'provenance.excess-inferred':'warn','provenance.low-confidence':'warn','provenance.contradicted':'warn' }[id]])),
};

const SEVERITIES = new Set(['error', 'warn', 'off']);

export async function loadConfig(vaultPath, explicitPath) {
  const configPath = explicitPath || join(vaultPath, '.trustwiki.json');
  let user = {};
  try {
    user = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') return { error: { message: `invalid ${configPath}: ${e.message}` } };
  }
  const rules = { ...DEFAULT_CONFIG.rules, ...(user.rules || {}) };
  const unknown = Object.keys(rules).filter(id => !RULE_IDS.includes(id));
  if (unknown.length) return { error: { message: `unknown rule id(s): ${unknown.join(', ')}` } };
  const badSev = Object.entries(rules).filter(([, s]) => !SEVERITIES.has(s));
  if (badSev.length) return { error: { message: `bad severity for: ${badSev.map(([k]) => k).join(', ')} (use error|warn|off)` } };
  const { roots, index, sourceDir, typeByDir, minOutboundLinks,
          inferredThreshold, confidenceFloor, inferredSkipTypes } = { ...DEFAULT_CONFIG, ...user };
  return { config: {
    vaultPath: resolve(vaultPath), roots, index, sourceDir, typeByDir: typeByDir || {},
    minOutboundLinks, inferredThreshold, confidenceFloor, inferredSkipTypes: inferredSkipTypes || [], rules,
  } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/config.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore cli/config.js test/config.test.js
git commit -m "feat(cli): config loader with defaults, validation, exit-2 error shape"
```

---

### Task 2: Vault walker

**Files:**
- Create: `cli/walk.js`
- Test: `test/walk.test.js`

**Interfaces:**
- Produces: `walkVault(vaultPath, roots) → Promise<string[]>` — relative `.md` paths (POSIX separators), sorted; skips dot-dirs, `node_modules`, and the file named by `index` (caller passes `null` to include everything).

- [ ] **Step 1: Write the failing test**

```js
// test/walk.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/walk.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/walk.js
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SKIP = new Set(['.git', 'node_modules']);

export async function walkVault(root, roots, indexFile = null) {
  const out = [];
  async function rec(rel) {
    const abs = join(root, rel);
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
      const relChild = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await rec(relChild);
      else if (entry.name.endsWith('.md') && relChild !== indexFile) out.push(relChild);
    }
  }
  for (const r of roots.length ? roots : ['.']) await rec(r === '.' ? '' : r);
  return out.sort();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/walk.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/walk.js test/walk.test.js
git commit -m "feat(cli): vault walker with root scoping and index skip"
```

---

### Task 3: Frontmatter parser

**Files:**
- Create: `cli/frontmatter.js`
- Test: `test/frontmatter.test.js`

**Interfaces:**
- Produces: `parseFrontmatter(text) → {ok:true, fields:Record<string,string>, body:string, bodyStartLine:number} | {ok:false, reason:string, body:string, bodyStartLine:1}`; helper `parseList(value) → string[]`.

- [ ] **Step 1: Write the failing test**

```js
// test/frontmatter.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/frontmatter.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/frontmatter.js
export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { ok: false, reason: 'missing', body: text, bodyStartLine: 1 };
  const end = text.match(/^---\s*$/m);
  const lines = text.split('\n');
  if (!end || end.index === 0) return { ok: false, reason: 'unterminated', body: text, bodyStartLine: 1 };
  const endLine = text.slice(0, end.index).split('\n').length; // 1-based line of closing ---
  const fields = {};
  let lastKey = null;
  for (let i = 1; i < endLine - 1; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (m && !line.startsWith(' ') && !line.startsWith('-')) {
      const [, k, v] = m;
      if (v === '' || /^(||-|>|-|>-)$/.test(v)) { fields[k.toLowerCase()] = ''; lastKey = k.toLowerCase(); }
      else { fields[k.toLowerCase()] = v.trim().replace(/^["']|["']$/g, ''); lastKey = null; }
    } else if (lastKey && (line.startsWith(' ') || line.startsWith('- '))) {
      fields[lastKey] = `${fields[lastKey]} ${line.replace(/^(\s+|- )/, '')}`.trim();
    }
  }
  const body = lines.slice(endLine).join('\n');
  return { ok: true, fields, body, bodyStartLine: endLine + 1 };
}

export function parseList(value) {
  if (!value) return [];
  const inner = value.trim().replace(/^\[|\]$/g, '');
  return inner ? inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/frontmatter.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add cli/frontmatter.js test/frontmatter.test.js
git commit -m "feat(cli): frontmatter parser with multiline scalars and body offset"
```

---

### Task 4: Wikilink extractor

**Files:**
- Create: `cli/links.js`
- Test: `test/links.test.js`

**Interfaces:**
- Produces: `extractWikilinks(body, bodyStartLine) → {target, alias|null, line}[]`.

- [ ] **Step 1: Write the failing test**

```js
// test/links.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractWikilinks } from '../cli/links.js';

test('extracts targets, aliases, and correct absolute line numbers', () => {
  const body = '# T\n\nSee [[notes/a]] and [[notes/b|the B]].\nNot [[broken\nline]].\n';
  const links = extractWikilinks(body, 5);
  assert.deepEqual(links, [
    { target: 'notes/a', alias: null, line: 7 },
    { target: 'notes/b', alias: 'the B', line: 7 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/links.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/links.js
const WIKILINK_RE = /\[\[([^\]|\n]+)(?:\|([^\]\n]*))?\]\]/g;

export function extractWikilinks(body, bodyStartLine) {
  const out = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(WIKILINK_RE)) {
      out.push({ target: m[1].trim(), alias: m[2] ? m[2].trim() : null, line: bodyStartLine + i });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/links.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/links.js test/links.test.js
git commit -m "feat(cli): wikilink extractor with line numbers"
```

---

### Task 5: Citation parser (grammar v0.1 — the core asset)

**Files:**
- Create: `cli/citations.js`
- Test: `test/citations.test.js`

**Interfaces:**
- Produces: `findCitations(body, bodyStartLine) → {citations:{raw,line,sources:{path,start,end}[]}[]. ok[] merged, malformed:{raw,line,reason}[]}`; `parseCitation(raw) → {ok:true, sources} | {ok:false, reason}`. Grammar: `^[path(:s-e|#Ls-Le)?(, path(…)?)*]`; path may omit `.md`; `s`/`e` positive ints, `s ≤ e`.

- [ ] **Step 1: Write the failing test**

```js
// test/citations.test.js
import { test } from 'node:text'.replace; // placeholder removed below
```
*(Use exactly this import block instead:)*

```js
// test/citations.test.js
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
  assert.match(parseCitation('a.md:99-10').reason, /start > end|reversed/i);
  assert.match(parseCitation('a.md foo.md').reason, /separator|source/i);
});

test('findCitations computes absolute lines and separates malformed', () => {
  const body = '# T\n\nCited.^[sources/tea.md:1-2]\n\nBad.^[a.md:9-1]\n';
  const r = findCitations(body, 5);
  assert.deepEqual(r.citations.map(c => c.line), [7]);
  assert.deepEqual(r.malformed.map(m => m.line), [9]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/citations.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/citations.js
const CITATION_RE = /\^\[([^\]\n]*)\]/g;
const SOURCE_RE = /^([^\s:#]+(?:#[^\s:#]+)?)(?::(\d+)-(\d+)|#L(\d+)-L(\d+))?$/;

export function parseCitation(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty citation' };
  const sources = [];
  for (const part of trimmed.split(',').map(s => s.trim())) {
    const m = part.match(SOURCE_RE);
    if (!m) return { ok: false, reason: `bad source syntax: "${part}"` };
    const [, path, , c1s, c1e, c2s, c2e] = m;
    let start = null, end = null;
    if (c1s !== undefined) [start, end] = [Number(c1s), Number(c1e)];
    else if (c2s !== undefined) [start, end] = [Number(c2s), Number(c2e)];
    if (start !== null && start > end) return { ok: false, reason: `reversed line range in "${part}" (start > end)` };
    sources.push({ path, start, end });
  }
  return { ok: true, sources };
}

export function findCitations(body, bodyStartLine) {
  const citations = [], malformed = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(CITATION_RE)) {
      const parsed = parseCitation(m[1]);
      const at = { raw: m[0], line: bodyStartLine + i };
      if (parsed.ok) citations.push({ ...at, sources: parsed.sources });
      else malformed.push({ ...at, reason: parsed.reason });
    }
  }
  return { citations, malformed };
}
```

*(Implementation note: SOURCE_RE splits the optional range into colon-form (groups 2-4... adjusted) — if group indices fight you, two regexes are cleaner: match path first, then a range suffix. Keep the test contract fixed; internals may differ.)*

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/citations.test.js`
Expected: PASS (5 tests). If the combined SOURCE_RE misgroups, replace with sequential parsing:

```js
const RANGE_COLON = /^([^:]+):(\d+)-(\d+)$/, RANGE_ANCHOR = /^(.+)#L(\d+)-L(\d+)$/;
// try RANGE_ANCHOR, then RANGE_COLON, then bare path — emit {path,start,end}
```

- [ ] **Step 5: Commit**

```bash
git add cli/citations.js test/citations.test.js
git commit -m "feat(cli): citation grammar v0.1 parser with malformed detection"
```

---

### Task 6: Engine + report + bin (first end-to-end run)

**Files:**
- Create: `cli/engine.js`, `cli/report.js`, `cli/bin.js`
- Test: `test/engine.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: `lintVault(vaultPath, config) → Promise<finding[]>` where `finding = {rule, severity, file, line, message, hint}`; `formatText(findings, config) → string` (with `Σ` summary + degradation notices); `formatJson(findings) → string`; `bin.js` CLI contract: `trustwiki lint <path> [--json] [--config <file>]`, exit 0/1/2 per Global Constraints. `file` is vault-relative POSIX path; file-scope findings use `line: 1`.

- [ ] **Step 1: Write the failing test**

```js
// test/engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintVault } from '../cli/engine.js';
import { loadConfig } from '../cli/config.js';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('end-to-end: missing frontmatter and broken link produce errors, exit-1 set', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  await mkdir(join(dir, 'notes'), { recursive: true });
  await writeFile(join(dir, 'notes/plain.md'), '# no fm\n\nbroken [[notes/nowhere]]\n');
  const { config } = await loadConfig(dir);
  const findings = await lintVault(dir, config);
  const rules = new Set(findings.map(f => f.rule));
  assert.ok(rules.has('frontmatter.required'));
  assert.ok(rules.has('link.broken'));
  assert.ok(findings.every(f => ['error', 'warn'].includes(f.severity)));
  await rm(dir, { recursive: true, force: true });
});

test('degradation: index rules skip without notice-flag when index unset', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tw-'));
  await mkdir(join(dir, 'notes'), { recursive: true });
  await writeFile(join(dir, 'notes/a.md'), '---\ntitle: A\ncreated: 2026-09-05\nupdated: 2026-09-05\ntype: note\ntags: [x]\n---\n\nBody. Body.\n');
  const { config } = await loadConfig(dir);
  const findings = await lintVault(dir, config);
  assert.ok(!findings.some(f => f.rule === 'link.index-missing'));
  await rm(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/engine.js
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { walkVault } from './walk.js';
import { parseFrontmatter } from './frontmatter.js';
import { extractWikilinks } from './links.js';
import { findCitations } from './citations.js';
import { RULES } from './rules/index.js';

export async function lintVault(vaultPath, config) {
  const files = await walkVault(vaultPath, config.roots, config.index);
  const model = { vaultPath, config, files: [], indexEntries: null };
  if (config.index) {
    try {
      const raw = await readFile(join(vaultPath, config.index), 'utf8');
      model.indexEntries = new Set([...raw.matchAll(/\[\[([^\]|\n]+)/g)].map(m => normalizeTarget(m[1]));
      model.indexRaw = raw;
    } catch { model.indexEntries = null; /* degrade: index configured but unreadable */ }
  }
  for (const rel of files) {
    const text = await readFile(join(vaultPath, rel), 'utf8');
    const fm = parseFrontmatter(text);
    const bodyStartLine = fm.bodyStartLine;
    const file = {
      relPath: rel, text, fm, body: fm.body, bodyStartLine,
      links: extractWikilinks(fm.body, bodyStartLine),
      ...findCitations(fm.body, bodyStartLine),
      paragraphs: proseParagraphs(fm.body),
    };
    model.files.push(file);
  }
  const findings = [];
  for (const rule of RULES) {
    const severity = config.rules[rule.id];
    if (severity === 'off') continue;
    if (rule.needs === 'index' && !model.indexEntries) { model.degraded ??= []; model.degraded.push(rule.id); continue; }
    for (const f of rule.run(model)) {
      findings.push({ severity, file: f.file ?? '', line: f.line ?? 1, rule: rule.id, message: f.message, hint: f.hint ?? '' });
    }
  }
  return findings;
}

function normalizeTarget(t) { return t.trim().replace(/\.md$/, ''); }
export function resolveTarget(t, cfg) {
  const cands = [t, `${t}.md`, cfg.sourceDir ? `${cfg.sourceDir}/${t}` : null, cfg.sourceDir ? `${cfg.sourceDir}/${t}.md` : null];
  return cands.filter(Boolean);
}
function proseParagraphs(body) {
  const out = []; let cur = null; let line = 1; let start = null;
  for (const block of body.split(/\n[ \t]*\n/)) {
    const trimmed = block.trim();
    const first = trimmed.split('\n')[0] || '';
    const isProse = trimmed && !/^(#|>|-\s|\||```|\d+\.\s)/.test(first);
    const offset = body.slice(0, body.indexOf(block)).split('\n').length;
    out.push({ text: trimmed, startLine: bodyStartLineOf(body, block), cited: trimmed.includes('^['), isProse });
  }
  return out;
}
function bodyStartLineOf(body, block) {
  const idx = body.indexOf(block);
  return body.slice(0, idx).split('\n').length;
}
```
*(Cleanup note for implementer: remove the unused `line`/`start`/`cur` vars and the duplicate `offset` computation left in `proseParagraphs` — ship the trimmed version, the contract is `{text, startLine, cited, isProse}[]`.)*

```js
// cli/report.js
export function formatText(findings, config) {
  const lines = [];
  const byFile = new Map();
  for (const f of findings) { (byFile.get(f.file) ?? byFile.set(f.file, []).get(f.file)).push(f); }
  for (const [file, fs] of [...byFile.entries()].sort()) {
    lines.push(`${file}`);
    for (const f of fs.sort((a, b) => a.line - b.line)) {
      lines.push(`  L${String(f.line).padEnd(4)} ${f.severity.padEnd(5)} ${f.rule.padEnd(28)} ${f.message}`);
      if (f.hint) lines.push(`      ↳ ${f.hint}`);
    }
  }
  const errors = findings.filter(f => f.severity === 'error').length;
  const warns = findings.filter(f => f.severity === 'warn').length;
  lines.push(`Σ ${errors} error${errors === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'} across ${byFile.size} file${byFile.size === 1 ? '' : 's'}`);
  return lines.join('\n');
}
export function formatJson(findings) { return JSON.stringify(findings, null, 2); }
```

```js
// cli/bin.js
#!/usr/bin/env node
import { loadConfig } from './config.js';
import { lintVault } from './engine.js';
import { formatText, formatJson } from './report.js';

const args = process.argv.slice(2);
if (args[0] !== 'lint' || !args[1] || args[1].startsWith('--')) {
  console.error('usage: trustwiki lint <vault-path> [--json] [--config <file>]');
  process.exit(2);
}
const vault = args[1];
const json = args.includes('--json');
const configFlag = args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined;
const { config, error } = await loadConfig(vault, configFlag);
if (error) { console.error(`trustwiki: ${error.message}`); process.exit(2); }
const findings = await lintVault(config.vaultPath, config);
console.log(json ? formatJson(findings) : formatText(findings, config));
process.exit(findings.some(f => f.severity === 'error') ? 1 : 0);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js && node cli/bin.js lint test/fixtures/any-vault 2>&1; echo "exit=$?"`
Expected: PASS; the CLI run on a nonexistent path is allowed to error — verify usage error path separately with `node cli/bin.js` → prints usage, exit 2.

- [ ] **Step 5: Commit**

```bash
git add cli/engine.js cli/report.js cli/bin.js test/engine.test.js
git commit -m "feat(cli): lint engine, text/json reports, bin with 0/1/2 exit contract"
```

---

### Task 7: Frontmatter + placeholder rules

**Files:**
- Create: `cli/rules/index.js`, `cli/rules/frontmatter-required.js`, `cli/rules/frontmatter-fields.js`, `cli/rules/placeholder-present.js`
- Test: `test/rules-frontmatter.test.js`

**Interfaces:**
- Produces: `RULES` array (consumed by engine since Task 6 — engine test will go green here). Rule module contract: `export const rule = { id, needs?: 'index', run(model) → {file?, line?, message, hint?}[] }`.

- [ ] **Step 1: Write the failing test**

```js
// test/rules-frontmatter.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';
import { parseFrontmatter } from '../cli/frontmatter.js';

const get = id => RULES.find(r => r.id === id);
const file = (text, relPath = 'notes/x.md') => {
  const fm = parseFrontmatter(text);
  return { relPath, text, fm, body: fm.body, bodyStartLine: fm.bodyStartLine, links: [], citations: [], malformed: [], paragraphs: [] };
};
const model = files => ({ config: { rules: {} }, files });

test('frontmatter.required fires once per file without fm', () => {
  const r = get('frontmatter.required');
  const fs = r.run(model([file('no fm here\n', 'notes/a.md'), file('---\ntitle: T\ncreated: 1\nupdated: 1\ntype: note\ntags: []\n---\nbody\n', 'notes/b.md')]));
  assert.deepEqual(fs.map(f => f.file), ['notes/a.md']);
});

test('frontmatter.fields lists each missing required field with line 1', () => {
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

test('placeholder.present flags TODO in first 20 body lines with line number', () => {
  const r = get('placeholder.present');
  const fs = r.run(model([file('---\ntitle: T\ncreated: 1\nupdated: 1\ntype: note\ntags: []\n---\n\nTODO: finish\n', 'notes/a.md')]));
  assert.deepEqual(fs.map(f => f.line), [8]); // body starts at line 8; TODO on first body line
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/rules-frontmatter.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/rules/frontmatter-required.js
export const rule = {
  id: 'frontmatter.required',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) out.push({ file: f.relPath, line: 1,
        message: 'missing or unreadable YAML frontmatter',
        hint: 'add a --- block with title/created/updated/type/tags' });
    }
    return out;
  },
};
```

```js
// cli/rules/frontmatter-fields.js
const BASE = ['title', 'created', 'updated', 'type', 'tags'];
const SOURCE = ['source_url', 'ingested', 'sha256'];
export const rule = {
  id: 'frontmatter.fields',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      const isSource = f.fm.fields.type === 'source' || f.relPath.startsWith(`${model.config.sourceDir || 'sources'}/`);
      const missing = [...BASE, ...(isSource ? SOURCE : [])].filter(k => !f.fm.fields[k]);
      if (missing.length) out.push({ file: f.relPath, line: 1,
        message: `missing frontmatter field(s): ${missing.join(', ')}`,
        hint: 'see schema/spec.md — Frontmatter' });
    }
    return out;
  },
};
```

```js
// cli/rules/placeholder-present.js
const RE = /\b(TODO|TBD|FIXME|lorem ipsum)\b/i;
export const rule = {
  id: 'placeholder.present',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const head = f.body.split('\n').slice(0, 20).join('\n');
      const m = head.match(RE);
      if (m) out.push({ file: f.relPath, line: f.bodyStartLine + head.slice(0, m.index).split('\n').length - 1,
        message: `placeholder text: ${m[0]}`, hint: 'unfinished content erodes trust — finish or remove' });
    }
    return out;
  },
};
```

```js
// cli/rules/index.js
import { rule as frontmatterRequired } from './frontmatter-required.js';
import { rule as frontmatterFields } from './frontmatter-fields.js';
import { rule as placeholderPresent } from './placeholder-present.js';
import { rule as linkBroken } from './link-broken.js';
import { rule as indexMissing } from './link-index-missing.js';
import { rule as typeMismatch } from './link-type-mismatch.js';
import { rule as pageOrphan } from './page-orphan.js';
import { rule as citationMalformed } from './citation-malformed.js';
import { rule as citationTarget } from './citation-target-missing.js';
import { rule as excessInferred } from './provenance-excess-inferred.js';
import { rule as lowConfidence } from './provenance-low-confidence.js';
import { rule as contradicted } from './provenance-contradicted.js';

export const RULES = [
  frontmatterRequired, frontmatterFields, placeholderPresent,
  linkBroken, indexMissing, typeMismatch, pageOrphan,
  citationMalformed, citationTarget,
  excessInferred, lowConfidence, contradicted,
];
```
*(Tasks 8–10 fill the remaining nine modules; create `cli/rules/index.js` in this task with the nine missing imports commented `// Task 8–10` so Task 6's engine test goes green only after those land — or temporarily filter `RULES.filter(r => r.run)`. Choose the filter approach: `export const RULES = [...].filter(r => r.run);` and drop the filter in Task 10.)*

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/rules-frontmatter.test.js && node --test test/engine.test.js`
Expected: PASS (engine test now green: rules exist)

- [ ] **Step 5: Commit**

```bash
git add cli/rules/ test/rules-frontmatter.test.js
git commit -m "feat(rules): frontmatter.required/.fields + placeholder.present with rule registry"
```

---

### Task 8: Link rules (broken / index-missing / type-mismatch / orphan)

**Files:**
- Create: `cli/rules/link-broken.js`, `cli/rules/link-index-missing.js`, `cli/rules/link-type-mismatch.js`, `cli/rules/page-orphan.js`
- Test: `test/rules-link.test.js`

**Interfaces:**
- Consumes: `model.indexEntries` (Set of normalized targets), `model.config.typeByDir`.
- Produces: four rule modules per Task 7 contract.

- [ ] **Step 1: Write the failing test**

```js
// test/rules-link.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';

const mkFile = (relPath, fmOk, links, opts = {}) => ({
  relPath, fm: { ok: fmOk, fields: opts.fields || {} }, body: opts.body || '', bodyStartLine: opts.bodyStartLine || 1,
  links, citations: [], malformed: [], paragraphs: [], text: '',
});
const model = (files, cfg = {}) => ({ files, config: { minOutboundLinks: 2, index: 'index.md', sourceDir: 'sources', typeByDir: { notes: 'note' }, ...cfg }, indexEntries: new Set(['notes/a']) });

test('link.broken: unique basename match resolves, otherwise finding with candidates hint', () => {
  const r = RULES.find(x => x.id === 'link.broken');
  const files = [
    mkFile('notes/a.md', true, [{ target: 'notes/a', alias: null, line: 3 }]),           // self → resolves
    mkFile('notes/b.md', true, [{ target: 'notes/zzz', alias: null, line: 4 }]),         // broken
  ];
  const fs = r.run(model(files));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/b.md', 4]]);
  assert.match(fs[0].hint, /create|fix/i);
});

test('link.index-missing fires per file absent from index; needs index', () => {
  const r = RULES.find(x => x.id === 'link.index-missing');
  assert.equal(r.needs, 'index');
  const fs = r.run(model([
    mkFile('notes/a.md', true, []), mkFile('notes/b.md', true, []),
  ]));
  assert.deepEqual(fs.map(f => f.file), ['notes/b.md']);
});

test('link.type-mismatch no-ops without typeByDir, checks dir→type when configured', () => {
  const r = RULES.find(x => x.id === 'link.type-mismatch');
  const files = [mkFile('notes/wrong.md', true, [], { fields: { type: 'moc' } })];
  assert.deepEqual(r.run(model(files, { typeByDir: {} })), []);
  const fs = r.run(model(files));
  assert.equal(fs[0].message.includes('moc'), true);
});

test('page.orphan: fewer than minOutboundLinks outbound wikilinks', () => {
  const r = RULES.find(x => x.id === 'page.orphan');
  const fs = r.run(model([
    mkFile('notes/lonely.md', true, [{ target: 'notes/a', alias: null, line: 2 }]),
    mkFile('notes/social.md', true, [{ target: 'notes/a', alias: null, line: 2 }, { target: 'notes/b', alias: null, line: 3 }]),
  ]));
  assert.deepEqual(fs.map(f => f.file), ['notes/lonely.md']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/rules-link.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/rules/link-broken.js
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export function resolvesTo(model, target) {
  const norm = target.replace(/\.md$/, '');
  if (model.filePaths.has(`${norm}.md`)) return true;          // exact path
  const base = `${norm.split('/').pop()}.md`;                   // unique basename anywhere
  const hits = [...model.filePaths].filter(p => p.endsWith(`/${base}`) || p === base);
  return hits.length === 1;
}

export const rule = {
  id: 'link.broken',
  run(model) {
    const out = [];
    for (const f of model.files) for (const l of f.links) {
      if (!resolvesTo(model, l.target)) out.push({ file: f.relPath, line: l.line,
        message: `broken wikilink [[${l.target}]]`,
        hint: 'fix the path or create the target page' });
    }
    return out;
  },
};
```
*(Engine addition required: populate `model.filePaths = new Set(files.map(f => f.relPath))` and `model.allBasenames` if needed — add in Task 8 alongside, one line in `lintVault`.)*

```js
// cli/rules/link-index-missing.js
export const rule = {
  id: 'link.index-missing', needs: 'index',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const norm = f.relPath.replace(/\.md$/, '');
      let listed = model.indexEntries.has(norm);
      if (!listed) { const base = norm.split('/').pop(); listed = [...model.indexEntries].some(e => e.endsWith(`/${base}`) || e === base); }
      if (!listed) out.push({ file: f.relPath, line: 1,
        message: 'missing from index',
        hint: `add an entry to ${model.config.index}` });
    }
    return out;
  },
};
```

```js
// cli/rules/link-type-mismatch.js
export const rule = {
  id: 'link.type-mismatch',
  run(model) {
    const out = [];
    if (!Object.keys(model.config.typeByDir).length) return out; // no-op by design
    for (const f of model.files) {
      const topDir = f.relPath.split('/')[0];
      const want = model.config.typeByDir[topDir];
      const got = f.fm.ok ? f.fm.fields.type : undefined;
      if (want && got && got !== want) out.push({ file: f.relPath, line: 1,
        message: `type "${got}" does not match directory type "${want}"`,
        hint: `set type: ${want} or move the page` });
    }
    return out;
  },
};
```

```js
// cli/rules/page-orphan.js
export const rule = {
  id: 'page.orphan',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      const n = f.links.length;
      if (n < model.config.minOutboundLinks) out.push({ file: f.relPath, line: 1,
        message: `only ${n} outbound link(s) — orphaned page`,
        hint: `weave in at least ${model.config.minOutboundLinks} related pages` });
    }
    return out;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/rules-link.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add cli/rules/ test/rules-link.test.js cli/engine.js
git commit -m "feat(rules): link.broken/.index-missing/.type-mismatch + page.orphan"
```

---

### Task 9: Citation rules (malformed / target-missing)

**Files:**
- Create: `cli/rules/citation-malformed.js`, `cli/rules/citation-target-missing.js`
- Test: `test/rules-citation.test.js`

**Interfaces:**
- Consumes: `f.citations`, `f.malformed` (from engine), `resolveTarget(target, cfg)` from `cli/engine.js` (export it there in this task: candidates `[p, p+'.md', sourceDir/p, sourceDir/p+'.md']` checked with `existsSync(join(vaultPath, cand))`).

- [ ] **Step 1: Write the failing test**

```js
// test/rules-citation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';

const mk = (relPath, citations, malformed) => ({ relPath, citations, malformed, fm: { ok: true, fields: {} }, links: [], paragraphs: [], body: '', bodyStartLine: 1, text: '' });
const model = (files, cfg = {}) => ({ files, config: { sourceDir: 'sources', ...cfg }, vaultPath: FIXTURES_DIR });

import { join } from 'node:path';
const FIXTURES_DIR = join(import.meta.dirname, 'fixtures', 'citation-fs');
// pre-created in Step 1b below: fixtures/citation-fs/sources/real.md

test('citation.malformed passes through parser reasons with line numbers', () => {
  const r = RULES.find(x => x.id === 'citation.malformed');
  const fs = r.run(model([mk('notes/a.md', [], [{ raw: '^[a.md:9-1]', line: 12, reason: 'reversed line range in "a.md:9-1" (start > end)' }])]));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/a.md', 12]]);
});

test('citation.target-missing resolves against sourceDir; existing target passes', () => {
  const r = RULES.find(x => x.id === 'citation.target-missing');
  const fs = r.run(model([
    mk('notes/ok.md', [{ raw: 'x', line: 5, sources: [{ path: 'sources/real.md', start: null, end: null }] }], []),
    mk('notes/bad.md', [{ raw: 'x', line: 7, sources: [{ path: 'sources/ghost.md', start: null, end: null }] }], []),
  ]));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/bad.md', 7]]);
});
```

**Step 1b — create the filesystem fixture:**

```
# test/fixtures/citation-fs/sources/real.md   (any content, e.g. "real\n")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/rules-citation.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/rules/citation-malformed.js
export const rule = {
  id: 'citation.malformed',
  run(model) {
    const out = [];
    for (const f of model.files) for (const m of f.malformed) {
      out.push({ file: f.relPath, line: m.line, message: `malformed citation ${m.raw} — ${m.reason}`,
        hint: 'grammar: ^[path(:s-e)?(, path…)*] — see schema/spec.md' });
    }
    return out;
  },
};
```

```js
// cli/rules/citation-target-missing.js
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTarget } from '../engine.js';

export const rule = {
  id: 'citation.target-missing',
  run(model) {
    const out = [];
    for (const f of model.files) for (const c of f.citations) {
      for (const s of c.sources) {
        const hits = resolveTarget(s.path, model.config).filter(cand => existsSync(join(model.vaultPath, cand)));
        if (!hits.length) out.push({ file: f.relPath, line: c.line,
          message: `citation target not found: ${s.path}`,
          hint: model.config.sourceDir ? `create under ${model.config.sourceDir}/ or fix the path` : 'create the source file or fix the path' });
      }
    }
    return out;
  },
};
```
*(Engine addition: `export function resolveTarget(t, cfg) { const cands = [t, `${t}.md`]; if (cfg.sourceDir) cands.push(`${cfg.sourceDir}/${t}`, `${cfg.sourceDir}/${t}.md`); return cands; }` — move the stub from Task 6 into this exported form.)*

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/rules-citation.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add cli/rules/ test/rules-citation.test.js test/fixtures/citation-fs cli/engine.js
git commit -m "feat(rules): citation.malformed + citation.target-missing with sourceDir resolution"
```

---

### Task 10: Provenance rules (excess-inferred / low-confidence / contradicted)

**Files:**
- Create: `cli/rules/provenance-excess-inferred.js`, `cli/rules/provenance-low-confidence.js`, `cli/rules/provenance-contradicted.js`
- Modify: `cli/rules/index.js` (remove the temporary `.filter(r => r.run)` crutch)
- Test: `test/rules-provenance.test.js`

**Interfaces:**
- Consumes: `f.paragraphs` (`{text, startLine, cited, isProse}`), `f.fm.fields.confidence`, `f.body`.
- Produces: complete 12-rule registry.

- [ ] **Step 1: Write the failing test**

```js
// test/rules-provenance.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../cli/rules/index.js';

const mk = (relPath, { fields = {}, paragraphs = [], body = '' } = {}) =>
  ({ relPath, fm: { ok: true, fields }, paragraphs, body, links: [], citations: [], malformed: [], text: '', bodyStartLine: 1 });
const model = (files, cfg = {}) => ({ files, config: { inferredThreshold: 0.3, confidenceFloor: 0.5, inferredSkipTypes: ['source'], ...cfg } });

test('excess-inferred: >threshold uncited prose paragraphs, skips source type, reports first uncited line', () => {
  const r = RULES.find(x => x.id === 'provenance.excess-inferred');
  const ps = [
    { text: 'cited', startLine: 10, cited: true, isProse: true },
    { text: 'uncited one', startLine: 14, cited: false, isProse: true },
    { text: 'uncited two', startLine: 16, cited: false, isProse: true },
  ];
  const fs = r.run(model([
    mk('notes/a.md', { paragraphs: ps, fields: { type: 'note' } }),
    mk('sources/b.md', { paragraphs: ps, fields: { type: 'source' } }),
  ]));
  assert.deepEqual(fs.map(f => [f.file, f.line]), [['notes/a.md', 14]]);
});

test('low-confidence: confidence below floor reports value', () => {
  const r = RULES.find(x => x.id === 'provenance.low-confidence');
  const fs = r.run(model([mk('notes/a.md', { fields: { confidence: '0.3' } }), mk('notes/b.md', { fields: { confidence: '0.8' } })]));
  assert.deepEqual(fs.map(f => f.file), ['notes/a.md']);
  assert.match(fs[0].message, /0\.3/);
});

test('contradicted: callout without contradicted_by AND backmatter without callout both flagged', () => {
  const r = RULES.find(x => x.id === 'provenance.contradicted');
  const files = [
    mk('notes/a.md', { body: 'x\n\n> [!contradiction] see [[notes/b]]\n' }),            // callout, no fm list
    mk('notes/b.md', { fields: { contradicted_by: '[notes/a]' }, body: 'quiet\n' }),     // fm list, no callout
  ];
  const fs = r.run(model(files));
  assert.deepEqual(fs.map(f => f.file).sort(), ['notes/a.md', 'notes/b.md']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/rules-provenance.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Write minimal implementation**

```js
// cli/rules/provenance-excess-inferred.js
export const rule = {
  id: 'provenance.excess-inferred',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      if (model.config.inferredSkipTypes.includes(f.fm.fields.type)) continue;
      const prose = f.paragraphs.filter(p => p.isProse && p.text);
      if (!prose.length) continue;
      const uncited = prose.filter(p => !p.cited);
      if (uncited.length / prose.length > model.config.inferredThreshold) {
        out.push({ file: f.relPath, line: uncited[0].startLine,
          message: `${uncited.length}/${prose.length} prose paragraphs uncited (>${model.config.inferredThreshold})`,
          hint: 'cite sources or mark the page as inference — unattributed claims erode trust' });
      }
    }
    return out;
  },
};
```

```js
// cli/rules/provenance-low-confidence.js
export const rule = {
  id: 'provenance.low-confidence',
  run(model) {
    const out = [];
    for (const f of model.files) {
      const c = Number(f.fm?.ok ? f.fm.fields.confidence : NaN);
      if (!Number.isNaN(c) && c < model.config.confidenceFloor) {
        out.push({ file: f.relPath, line: 1,
          message: `confidence ${c} below floor ${model.config.confidenceFloor}`,
          hint: 'add sources to raise confidence, or archive the page' });
      }
    }
    return out;
  },
};
```

```js
// cli/rules/provenance-contradicted.js
export const rule = {
  id: 'provenance.contradicted',
  run(model) {
    const out = [];
    const CALLOUT = /\[!contradiction\]([^\n]*)/;
    const targetsIn = b => [...b.matchAll(/\[\[([^\]|\n]+)/g)].map(m => m[1].trim());
    for (const f of model.files) {
      const m = f.body.match(CALLOUT);
      const calloutTargets = m ? targetsIn(m[1]) : [];
      const fmList = (f.fm?.fields?.contradicted_by || '').replace(/[\[\]]/g, '');
      const fmTargets = fmList ? fmList.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (m && !fmTargets.length) out.push({ file: f.relPath, line: f.bodyStartLine + f.body.slice(0, m.index).split('\n').length - 1,
        message: 'contradiction callout without contradicted_by in frontmatter',
        hint: 'mirror the contradiction in frontmatter so lint can check both sides' });
      if (!m && fmTargets.length) out.push({ file: f.relPath, line: 1,
        message: 'contradicted_by lists targets but no [!contradiction] callout in body',
        hint: 'surface the conflict in the body so readers see it' });
    }
    return out;
  },
};
```

```js
// cli/rules/index.js — remove `.filter(r => r.run)` once all 12 modules exist
```

- [ ] **Step 4: Run test to verify it passes + full suite**

Run: `node --test test/rules-provenance.test.js && node --test test/`
Expected: PASS; full suite green; `RULES.length === 12`

- [ ] **Step 5: Commit**

```bash
git add cli/rules/ test/rules-provenance.test.js
git commit -m "feat(rules): provenance.excess-inferred/.low-confidence/.contradicted — registry complete at 12 rules"
```

---

### Task 11: demo-vault fixture + golden test (the GIF script)

**Files:**
- Create: `templates/demo-vault/.trustwiki.json`, `templates/demo-vault/index.md`, `templates/demo-vault/notes/{honest-page,sloppy-page,conflict-a,conflict-b}.md`, `templates/demo-vault/sources/tea.md`
- Test: `test/golden.test.js`

**Interfaces:**
- Consumes: full engine. The golden assertions below are the contract — do not "fix" the fixture to make findings disappear.

- [ ] **Step 1: Create fixture files with exact content**

```
# templates/demo-vault/.trustwiki.json
{
  "roots": ["notes", "sources"],
  "index": "index.md",
  "sourceDir": "sources",
  "rules": { "page.orphan": "off" }
}
```

```
# templates/demo-vault/index.md           (6 lines; all entries resolve → index-missing silent)
# Demo vault

- [[notes/honest-page]] — cited example
- [[notes/sloppy-page]] — the patient
- [[notes/conflict-a]] — contradiction side A
- [[notes/conflict-b]] — contradiction side B
- [[sources/tea]] — raw source
```

```
# templates/demo-vault/notes/honest-page.md   (CLEAN page — no findings)
 1 ---
 2 title: Honest Page
 3 created: 2026-09-05
 4 updated: 2026-09-05
 5 type: note
 6 tags: [demo]
 7 ---
 8
 9 # Honest page
10
11 Everything here is cited.^[sources/tea.md] Ranges work too.^[sources/tea.md:1-2]
12
13 Links out: [[notes/conflict-a]] and [[notes/sloppy-page]]. The method itself.^[sources/tea.md]
```

```
# templates/demo-vault/notes/sloppy-page.md    (6 findings — the GIF money shot)
 1 ---
 2 title: Sloppy Page
 3 created: 2026-09-05
 4 updated: 2026-09-05
 5 type: note
 6 tags: [demo]
 7 confidence: 0.3
 8 ---
 9
10 # Sloppy page
11
12 This paragraph asserts things with a broken citation.^[sources/ghost.md]
13
14 This paragraph claims facts but has no citation at all and rambles on long enough to be real prose without any source.
15
16 TODO: finish this section
17
18 See [[notes/dead-ref]] someday.
19
20 Broken range cite.^[sources/tea.md:99-10]
```

```
# templates/demo-vault/notes/conflict-a.md
 1 ---
 2 title: Conflict A
 3 created: 2026-09-05
 4 updated: 2026-09-05
 5 type: note
 6 tags: [demo]
 7 ---
 8
 9 # Conflict A
10
11 Tea should be brewed at 100°C.^[sources/tea.md]
12
13 > [!contradiction] see [[notes/conflict-b]] which holds the opposite view
```

```
# templates/demo-vault/notes/conflict-b.md
 1 ---
 2 title: Conflict B
 3 created: 2026-09-05
 4 updated: 2026-09-05
 5 type: note
 6 tags: [demo]
 7 contradicted_by: [notes/conflict-a]
 8 ---
 9
10 # Conflict B
11
12 Tea should be brewed at 80°C.^[sources/tea.md]
```

```
# templates/demo-vault/sources/tea.md          (type: source → inferred rule skips)
 1 ---
 2 title: Tea
 3 created: 2026-09-05
 4 updated: 2026-09-05
 5 type: source
 6 tags: [demo]
 7 source_url: https://example.com/tea
 8 ingested: 2026-09-05
 9 sha256: 0000000000000000000000000000000000000000000000000000000000000000
10 ---
11
12 Brewing temperatures vary by style.
```

- [ ] **Step 2: Write the failing golden test**

```js
// test/golden.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../cli/config.js';
import { lintVault } from '../cli/engine.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'demo-vault');

test('golden: demo-vault produces exactly these findings', async () => {
  const { config } = await loadConfig(dir);
  const findings = await lintVault(dir, config);
  const actual = findings.map(f => `${f.rule}:${f.file}:${f.line}`).sort();
  assert.deepEqual(actual, [
    'citation.malformed:notes/sloppy-page.md:20',
    'citation.target-missing:notes/sloppy-page.md:12',
    'link.broken:notes/sloppy-page.md:18',
    'placeholder.present:notes/sloppy-page.md:16',
    'provenance.contradicted:notes/conflict-a.md:13',
    'provenance.contradicted:notes/conflict-b.md:7',
    'provenance.excess-inferred:notes/sloppy-page.md:14',
    'provenance.low-confidence:notes/sloppy-page.md:7',
  ]);
});
```

- [ ] **Step 3: Run test, fix line drift only (never delete findings)**

Run: `node --test test/golden.test.js`
Expected: PASS. If a line number drifts, recount the fixture — adjust the FIXTURE, not the expectation, unless the expectation itself was miscalculated. `excess-inferred` ratio check for sloppy-page: paragraphs = L12 (cited), L14, L16, L18, L20 (cited) → 3/5 uncited = 0.6 > 0.3 ✓.

- [ ] **Step 4: Full suite + CLI end-to-end + exit codes**

Run: `node --test test/ && node cli/bin.js lint templates/demo-vault; echo "exit=$?"`
Expected: text report shows the 8 findings grouped by file, `Σ 3 errors, 5 warnings across 3 files`, exit=1.

- [ ] **Step 5: Commit**

```bash
git add templates/demo-vault test/golden.test.js
git commit -m "feat(golden): demo-vault fixture — 8-findings contract, GIF script, golden test"
```

---

### Task 12: `--json` output hardening

**Files:**
- Modify: `cli/bin.js` (already wired — add smoke test), `test/json.test.js` (create)

**Interfaces:**
- Produces: `trustwiki lint <path> --json` → findings array, machine-parseable, no trailing prose.

- [ ] **Step 1: Write the failing test (spawn the real CLI)**

```js
// test/json.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'bin.js');
const demo = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'demo-vault');

test('--json emits a parseable findings array; exit code is 1 (errors present)', () => {
  let out, code = 0;
  try { out = execFileSync('node', [bin, 'lint', demo, '--json'], { encoding: 'utf8' }); }
  catch (e) { out = e.stdout; code = e.status; }
  const parsed = JSON.parse(out);
  assert.ok(Array.isArray(parsed) && parsed.length === 8);
  assert.ok(parsed.every(f => ['rule', 'severity', 'file', 'line', 'message', 'hint'].every(k => k in f)));
  assert.equal(code, 1);
});

test('usage error exits 2', () => {
  try { execFileSync('node', [bin], { encoding: 'utf8' }); assert.fail('should exit 2'); }
  catch (e) { assert.equal(e.status, 2); }
});
```

- [ ] **Step 2: Run test to verify it fails or exposes bugs**

Run: `node --test test/json.test.js`
Expected: likely PASS already (bin wired in Task 6) — if not, fix bin; expected state is PASS with exit contract proven.

- [ ] **Step 3: Fix whatever the smoke test exposed (report formatting regressions etc.)**

- [ ] **Step 4: Run the full suite**

Run: `node --test test/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/json.test.js cli/
git commit -m "test(cli): --json and exit-code contract smoke tests via real process spawn"
```

---

### Task 13 (M2 gate): Migration-parity harness

**Files:**
- Create: `scripts/parity-check.mjs`
- Test: manual execution against the private wiki (env-gated, never committed)

**Interfaces:**
- Consumes: `TRUSTWIKI_PARITY_VAULT` env var pointing at the private wiki clone.
- Produces: verdict `PARITY OK` / `PARITY GAPS: …`; exit 0/1.

- [ ] **Step 1: Write the harness**

```js
// scripts/parity-check.mjs — operationalizes spec §5.4 (migration parity).
// Parity = category coverage: every wiki-lint ERROR/WARN category that fires
// on the private vault must fire its mapped trustwiki rule. Exact counts may
// differ (taxonomy mapping is not 1:1); zero-category loss is the gate.
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const vault = process.env.TRUSTWIKI_PARITY_VAULT;
if (!vault) { console.error('set TRUSTWIKI_PARITY_VAULT'); process.exit(2); }
const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'bin.js');

// wiki-lint output marker → trustwiki rule
const MAP = {
  'MISSING from index': 'link.index-missing',
  'FRONTMATTER': 'frontmatter.required',
  'BROKEN': 'link.broken',
  'orphan': 'page.orphan',
  'citation': 'citation.target-missing',
  'EXCESS INFERRED': 'provenance.excess-inferred',
  'LOW CONFIDENCE': 'provenance.low-confidence',
  'CONTRADICTED': 'provenance.contradicted',
};

let trustwikiRaw = '';
try { trustwikiRaw = execFileSync('node', [bin, 'lint', vault, '--json'], { encoding: 'utf8' }); }
catch (e) { trustwikiRaw = e.stdout; }
const trustwikiRules = new Set(JSON.parse(trustwikiRaw).map(f => f.rule));

const wikiRaw = execFileSync('node', [join(vault, 'scripts', 'wiki-lint.mjs')], { encoding: 'utf8', cwd: vault });
const gaps = [];
for (const [marker, rule] of Object.entries(MAP)) {
  const wikiHas = wikiRaw.includes(marker);
  const twHas = trustwikiRules.has(rule);
  if (wikiHas && !twHas) gaps.push(`wiki reports "${marker}" but trustwiki never fires ${rule}`);
}
console.log(gaps.length ? `PARITY GAPS:\n${gaps.join('\n')}` : 'PARITY OK');
process.exit(gaps.length ? 1 : 0);
```

- [ ] **Step 2: Run against the private wiki**

Run: `TRUSTWIKI_PARITY_VAULT=<path-to-private-vault> node scripts/parity-check.mjs`
Expected: `PARITY OK`. If gaps: fix the rule, not the harness. Known legitimate diffs to document in the commit message (not gaps): wiki-lint's index-header page-count drift check and glued-line detection stay private (not in the 12-rule v1 scope).

- [ ] **Step 3: Record the parity result in docs (M2 acceptance evidence)**

Append to `docs/2026-09-05-trustwiki-design.md` §5.4: date, vault, verdict, counts per rule.

- [ ] **Step 4: Commit**

```bash
git add scripts/parity-check.mjs docs/
git commit -m "test(m2): migration-parity harness — category-coverage gate vs private wiki-lint"
```

---

### Task 14 (M3): schema/spec.md + spec.zh.md

**Files:**
- Create: `schema/spec.md`, `schema/spec.zh.md`

**Interfaces:**
- Produces: `trustwiki-schema v0.1` — the frozen grammar verbatim from the design spec §3.2, plus frontmatter and contradiction sections.

- [ ] **Step 1: Write schema/spec.md**

Sections (in order, EN):
1. `## Status` — `trustwiki-schema v0.1, 2026-09-05. Frozen until v0.2; additions only, never rewrites.`
2. `## Citation grammar` — the exact EBNF block from design §3.2 (copy verbatim, including the `path may omit .md` rule and `s ≤ e` constraint), plus three worked examples: `^[sources/tea.md]`, `^[sources/tea.md:42-58]`, `^[sources/a.md, sources/b.md#L3-L4]`.
3. `## Placement rules` — citations attach to prose paragraph endings only; never headings, list items, code blocks. Uncited inference is allowed up to `inferredThreshold` (default 0.3) per page.
4. `## Frontmatter` — required base fields table (`title, created, updated, type, tags`), source-page additions (`source_url, ingested, sha256`), provenance fields (`confidence 0–1 float, provenance_state ∈ {extracted, merged, inferred, ambiguous}, contradicted_by list`).
5. `## Contradiction marking` — body callout format `> [!contradiction] … [[target]] …` mirrored by `contradicted_by` in frontmatter; both directions checked by `provenance.contradicted`.
6. `## Checking your vault` — `npx trustwiki lint ./vault` + config reference table (all keys from Task 1 with defaults).

- [ ] **Step 2: Write schema/spec.zh.md**

Full Chinese translation of spec.md (not a summary — same sections, same code blocks verbatim).

- [ ] **Step 3: Verify code blocks parse**

Run: manually extract each grammar/code block and re-run Task 5 tests mentally against examples — every example in the spec must produce `ok:true` from `parseCitation` (add these exact strings to `test/citations.test.js` as a "spec examples" test if not already covered).

- [ ] **Step 4: Commit**

```bash
git add schema/
git commit -m "feat(schema): trustwiki-schema v0.1 open spec (EN + zh), grammar frozen"
```

---

### Task 15 (M3): SKILL.md

**Files:**
- Create: `SKILL.md`

**Interfaces:**
- Produces: agent-installable skill, ≤200 lines, YAML frontmatter `name: trustwiki, description: …` (description must state *when to use*, agent-consumable).

- [ ] **Step 1: Write SKILL.md with this exact section skeleton**

```
---
name: trustwiki
description: Use when an agent creates or edits pages in a trustwiki-style
  knowledge base — enforces claim-level citations, contradiction marking,
  index hygiene, and pre-commit linting so agent-maintained knowledge stays
  trustworthy. Covers the four-phase method (Ingest → Synthesize → Evolve → Gate).
---
```

Then these `##` sections, each ≤30 lines, each ending with a "violation consequence" example drawn from real maintenance failures (sanitized — no private paths/names):
1. `## The one rule` — *Never write a claim your vault cannot trace.* Everything below is this rule made mechanical.
2. `## Phase: Ingest` — sources land first (`type: source` frontmatter with `source_url/ingested/sha256`), body is the source's words, never your paraphrase. Consequence: a `sha256` mismatch is how you discover silent edits later.
3. `## Phase: Synthesize` — every new page: ≥2 outbound wikilinks, backlink to raw source, per-paragraph citations, inference marked as inference. Consequence: the sloppy-page demo (link to templates/demo-vault) — show its 8 findings as the canonical failure gallery.
4. `## Phase: Evolve` — bump `updated` on every edit; conflicts get `[!contradiction]` + `contradicted_by`, never silent rewrites; index stays in sync with pages. Consequence: the glued-index-line incident class — silent index corruption that lint exists to catch.
5. `## Phase: Gate` — run `npx trustwiki lint ./vault`; completion = 0 errors. Warnings are debt, listed and owned.
6. `## Config quick reference` — pointer to schema/spec.md §Checking your vault.

- [ ] **Step 2: Verify constraints**

Run: `wc -l SKILL.md` (must be ≤200) and `grep -cE '/home/|/Users/' SKILL.md` (must be 0 — private-path leak check).

- [ ] **Step 3: Commit**

```bash
git add SKILL.md
git commit -m "feat(skill): trustwiki method as agent skill — four phases, violation-driven"
```

---

### Task 16 (M3): starter-vault template

**Files:**
- Create: `templates/starter-vault/{.trustwiki.json,index.md,notes/first-note.md,sources/example-source.md}`

**Interfaces:**
- Produces: a vault that passes `npx trustwiki lint templates/starter-vault` with **exit 0** (this is also the CI dogfood step).

- [ ] **Step 1: Create files**

`.trustwiki.json`:
```json
{
  "roots": ["notes", "sources"],
  "index": "index.md",
  "sourceDir": "sources"
}
```

`index.md`:
```markdown
# My vault

- [[notes/first-note]] — what this vault is for
- [[sources/example-source]] — first raw source
```

`sources/example-source.md`: frontmatter with `title/created/updated/type: source/tags/source_url: https://example.com/ingested/sha256: <64 zeros>` + one body paragraph (body may be uncited — `type: source` is exempt from inferred rule).

`notes/first-note.md`: full frontmatter, two cited paragraphs (`^[sources/example-source.md]`), two outbound links (`[[sources/example-source]]` + one more — add `notes/second-link-target`? No: keep the vault minimal — link to `[[sources/example-source]]` twice is not two distinct links; instead the note links `[[sources/example-source]]` and carries 2 citations; outbound-link count = 1 < 2 → would fire orphan. Resolution: set `"page.orphan": "warn"` is default — starter must stay exit 0, so warnings are allowed (exit 0 with warnings OK). Verify: orphan is `warn` by default → exit 0 holds. Add hint text in the note telling the user to grow links.)

- [ ] **Step 2: Verify exit 0**

Run: `node cli/bin.js lint templates/starter-vault; echo $?`
Expected: only warnings at most, `exit=0`.

- [ ] **Step 3: Commit**

```bash
git add templates/starter-vault
git commit -m "feat(templates): starter-vault — clean on first lint, zero-config hint inline"
```

---

### Task 17 (M3): docs/method.md + method.zh.md + proof/STATS.md

**Files:**
- Create: `docs/method.md`, `docs/method.zh.md`, `proof/STATS.md`

**Interfaces:**
- Consumes: RULE_IDS (12 rules), the wiki's public maintenance history (sanitized).

- [ ] **Step 1: docs/method.md — one section per rule, structured as: what rots → why the rule exists → what the check does → the incident class it came from**

Rule order (12 sections): group as *Truth* (citation.malformed, citation.target-missing, provenance.excess-inferred, provenance.low-confidence), *Conflict* (provenance.contradicted), *Structure* (link.broken, link.index-missing, link.type-mismatch, page.orphan, frontmatter.required, frontmatter.fields, placeholder.present). Each section ≤15 lines. Incident classes to draw from (sanitized, no private names): index glued-line corruption; silent source edits caught by sha256; contradiction silently rewritten away; slop-vault failure mode (fluent text, zero provenance).

- [ ] **Step 2: docs/method.zh.md** — full mirror translation.

- [ ] **Step 3: proof/STATS.md** — table with columns `metric | value | source | verified`; rows populated from the private wiki's lint run (page count from lint actual, raw source count, contradictions tracked, lint errors 0, operating since 2026-05). **Every row needs a verification date.** Numbers marked `TBD-AT-LAUNCH` stay until M4 verification step fills them — this is the only allowed TBD in the repo, and CI does not gate it.

- [ ] **Step 4: Commit**

```bash
git add docs/ proof/
git commit -m "feat(docs): method guide per rule (EN+zh) + living-stats template"
```

---

### Task 18 (M4): README (EN+zh) + dogfood config + CI + GIF tape

**Files:**
- Create: `README.md`, `README.zh.md`, `.trustwiki.json` (repo self-lint), `.github/workflows/ci.yml`, `assets/demo.tape`
- Modify: `proof/STATS.md` (fill `TBD-AT-LAUNCH` rows)

**Interfaces:**
- Produces: the public face; CI green is the merge gate for all future PRs.

- [ ] **Step 1: README.md — exact hero copy (EN)**

```markdown
# trustwiki

**Knowledge bases your agent can maintain — without lying to you.**

Every claim cited. Contradictions surfaced. Rot detected.

```bash
npx trustwiki lint ./your-vault
```

trustwiki is a provenance linter and an operating method for knowledge bases
maintained by AI agents. It does **not** build your wiki. It makes sure that
when your agent does, every claim can be traced to a source, disagreements
stay visible instead of being silently rewritten, and decay is measured —
not discovered two months later.

- **12 mechanical checks** — citation grammar, citation targets, uncited-inference ratio, confidence floor, contradiction consistency, broken links, index drift, orphans, placeholders
- **One config file** — `.trustwiki.json`; nothing configured, everything still runs
- **Zero dependencies** — Node 18+, one command, JSON output for CI
- **Proven in production** — [operating stats](proof/STATS.md) from an agent-maintained wiki running since 2026-05

## Why

Agents are already writing knowledge bases. Without a trust layer they
produce fluent slop: unattributed claims, silent contradiction resolution,
links that rot. trustwiki is the discipline layer — the linter, the schema,
and the method.
```

Then sections: `## Quick start` (lint demo-vault: expect the 8-finding report + exit 1 explained), `## The schema` (link schema/spec.md), `## The method` (link SKILL.md + docs/method.md), `## Configuration` (table), `## Stats` (link proof/STATS.md), `## License` (MIT).

- [ ] **Step 2: README.zh.md** — full translation, same structure, same commands verbatim.

- [ ] **Step 3: repo self-lint config `.trustwiki.json`**

```json
{ "roots": ["docs", "schema"], "rules": { "frontmatter.fields": "off", "link.index-missing": "off", "page.orphan": "off", "provenance.excess-inferred": "off" } }
```
(Docs are prose, not vault pages — only link/citation/placeholder checks apply. Verify `node cli/bin.js lint .` → exit 0.)

- [ ] **Step 4: CI workflow**

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm test
      - run: node cli/bin.js lint templates/starter-vault
      - run: node cli/bin.js lint templates/demo-vault --json > /dev/null
        # demo must FAIL with errors — golden test asserts the exact set; this asserts the CLI contract
      - run: node cli/bin.js lint templates/demo-vault --json > /dev/null && exit 1 || test $? -eq 1
```
*(Final step asserts demo exits 1; if the shell juggling fights the runner, replace with a tiny node script asserting the spawn status — same contract.)*

- [ ] **Step 5: GIF via vhs (`assets/demo.tape`)**

```
Output assets/demo.gif
RequireSize 900x500
Type "npx trustwiki lint templates/demo-vault"
Enter
Sleep 2s
Sleep 8s
```
Record: `vhs assets/demo.tape` (requires `vhs` installed — optional, maintainer-local; not CI).

- [ ] **Step 6: Fill STATS rows + verify every README number**

Run: `node cli/bin.js lint templates/demo-vault --json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).length, 'findings'))"` → must print `8` (README Quick start quotes "8 findings"). Update any drift.

- [ ] **Step 7: Commit**

```bash
git add README.md README.zh.md .trustwiki.json .github/ assets/ proof/
git commit -m "feat(m4): bilingual README, self-lint config, CI, demo GIF, verified stats"
```

---

### Task 19 (M4): npm name check + publish + launch

**Files:**
- Modify: `package.json` (final metadata)

- [ ] **Step 1: npm name check**

Run: `npm view trustwiki`
Expected: 404 (free). If taken: fall back to `@trustwiki/cli` scope or `trustwiki-lint`, update `package.json` name + README install lines everywhere (grep `npx trustwiki`), re-run Task 18 Step 6.

- [ ] **Step 2: Final private-leak sweep**

Run: `grep -rnE "/home/|/Users/|wechat|hermes" --include="*.md" --include="*.js" --include="*.json" . | grep -v node_modules | grep -v PARITY`
Expected: zero hits (PARITY env var name in scripts/parity-check.mjs is the sole allowed mention of nothing private — verify no path values).

- [ ] **Step 3: Publish**

```bash
npm publish --tag alpha
```

- [ ] **Step 4: Tag + verify clean-machine install**

```bash
git tag v0.1.0-alpha.0 && git push origin main --tags
cd $(mktemp -d) && npm init -y >/dev/null && npx trustwiki lint ~/any-md-dir --json | head -5
```
Expected: valid JSON output on any markdown dir.

- [ ] **Step 5: Commit any final metadata fixes**

```bash
git add -A && git commit -m "chore: v0.1.0-alpha.0 publish metadata"
```

---

## Self-Review Record

- **Spec coverage:** 12 rules (Tasks 7–10) ↔ design §3.1 table ✓; citation grammar (Task 5) ↔ §3.2 ✓; degradation (Tasks 1, 6) ✓; demo-vault ↔ §3.4 table (all 6 GIF shots present: target-missing L12, malformed L20, excess-inferred L14, contradicted L13/L7, broken-link L18, clean-fix story via honest-page) ✓; parity gate ↔ §5.4 (operationalized as category coverage — documented interpretation) ✓; EN+zh (Tasks 14, 17, 18) ✓; exit codes (Tasks 6, 12) ✓; npm check (Task 19) ✓.
- **Placeholder scan:** no TBD/TODO except `proof/STATS.md` `TBD-AT-LAUNCH` rows, explicitly scoped and CI-exempt (design G4 requires launch-day verification, not pre-knowledge).
- **Type consistency:** `finding {rule,severity,file,line,message,hint}` used uniformly; `lintVault(vaultPath, config)`; `loadConfig(vaultPath, explicitPath)`; rule contract `{id, needs?, run(model)}` consistent across Tasks 7–10; `resolveTarget` exported from engine, consumed by citation-target-missing ✓.
