#!/usr/bin/env node
// Migration-parity harness (spec §5.4) — operationalization: category coverage.
// Every wiki-lint category that fires on the private vault must have its mapped
// trustwiki rule fire too. Exact counts may differ (taxonomy not 1:1).
// Ruling R7: marker strings may be tuned to actual wiki-lint output; the
// coverage intent is binding.
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const vault = process.env.TRUSTWIKI_PARITY_VAULT;
if (!vault) { console.error('set TRUSTWIKI_PARITY_VAULT'); process.exit(2); }
const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'bin.js');

// scope the run to the private wiki's active surface (same dirs wiki-lint scans)
const VAULT_ROOTS = ['entities', 'concepts', 'comparisons', 'queries', 'moc', 'drafts', 'raw/articles'];
const { mkdtempSync, writeFileSync } = await import('node:fs');
const tmpCfg = join(mkdtempSync(join(process.env.TMPDIR || '/tmp', 'parity-')), '.trustwiki.json');
writeFileSync(tmpCfg, JSON.stringify({
  roots: VAULT_ROOTS, index: 'index.md', sourceDir: 'raw/articles',
  rules: { 'placeholder.present': 'off' },
}));
const BIG = { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' };

const MAP = {
  'MISSING from index': 'link.index-missing',
  'FRONTMATTER': 'frontmatter.required',
  'BROKEN': 'link.broken',
  'orphan': 'page.orphan',
  'EXCESS INFERRED': 'provenance.excess-inferred',
  'LOW CONFIDENCE': 'provenance.low-confidence',
  'CONTRADICTED': 'provenance.contradicted',
  'missing frontmatter field': 'frontmatter.fields',
};

let trustwikiRaw = '';
try {
  trustwikiRaw = execFileSync('node', [bin, 'lint', vault, '--json', '--config', tmpCfg], BIG);
} catch (e) { trustwikiRaw = e.stdout; }
let trustwikiRules;
try {
  trustwikiRules = new Set(JSON.parse(trustwikiRaw).map(f => f.rule));
} catch {
  console.error('trustwiki --json output was not parseable; aborting');
  process.exit(2);
}

const wikiRaw = execFileSync('node', ['scripts/wiki-lint.mjs'], { encoding: 'utf8', cwd: vault, maxBuffer: 64 * 1024 * 1024 });
const gaps = [];
const covered = [];
for (const [marker, rule] of Object.entries(MAP)) {
  const wikiHas = wikiRaw.includes(marker);
  const twHas = trustwikiRules.has(rule);
  if (wikiHas && !twHas) gaps.push(`wiki reports "${marker}" but trustwiki never fires ${rule}`);
  else if (wikiHas) covered.push(`${marker} → ${rule}`);
}
console.log(`covered categories:\n  ${covered.join('\n  ') || '(none fired on this vault)'}`);
if (gaps.length) {
  console.log(`PARITY GAPS:\n${gaps.join('\n')}`);
  process.exit(1);
}
console.log('PARITY OK');
