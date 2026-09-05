import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const RULE_IDS = [
  'frontmatter.required', 'frontmatter.fields', 'placeholder.present',
  'link.broken', 'link.index-missing', 'link.type-mismatch', 'page.orphan',
  'citation.malformed', 'citation.target-missing',
  'provenance.excess-inferred', 'provenance.low-confidence', 'provenance.contradicted',
  'provenance.stale-claim', 'config.index-unreadable',
];

const DEFAULT_SEVERITY = {
  'frontmatter.required': 'error', 'frontmatter.fields': 'error', 'placeholder.present': 'warn',
  'link.broken': 'error', 'link.index-missing': 'warn', 'link.type-mismatch': 'warn', 'page.orphan': 'warn',
  'citation.malformed': 'error', 'citation.target-missing': 'error',
  'provenance.excess-inferred': 'warn', 'provenance.low-confidence': 'warn', 'provenance.contradicted': 'warn',
  'provenance.stale-claim': 'warn', 'config.index-unreadable': 'warn',
};

// claim half-lives in days, measured on the author's production wiki
// (terminology drifts in ~30d, model-generation claims in ~59d,
// release-expectation claims in ~110d). Overridable per vault.
export const DEFAULT_HALF_LIVES = {
  terminology: 30,
  'model-generation': 59,
  'release-expectation': 110,
};

export const DEFAULT_CONFIG = {
  roots: ['.'],
  index: null,
  sourceDir: null,
  typeByDir: {},
  minOutboundLinks: 2,
  inferredThreshold: 0.3,
  confidenceFloor: 0.5,
  inferredSkipTypes: ['source'],
  halfLives: { ...DEFAULT_HALF_LIVES },
  asOf: null, // audit "as of" a past date; null = today (also makes tests deterministic)
  rules: Object.fromEntries(RULE_IDS.map(id => [id, DEFAULT_SEVERITY[id]])),
};

const SEVERITIES = new Set(['error', 'warn', 'off']);

export async function loadConfig(vaultPath, explicitPath) {
  const configPath = explicitPath || join(vaultPath, '.trustwiki.json');
  let user = {};
  try {
    user = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') return { error: { message: `invalid ${configPath}: ${e.message}` } };
    // an explicitly passed config file must exist — silent fallback would hide typos
    if (explicitPath) return { error: { message: `config file not found: ${explicitPath}` } };
  }
  const rules = { ...DEFAULT_CONFIG.rules, ...(user.rules || {}) };
  const unknown = Object.keys(rules).filter(id => !RULE_IDS.includes(id));
  if (unknown.length) return { error: { message: `unknown rule id(s): ${unknown.join(', ')}` } };
  const badSev = Object.entries(rules).filter(([, s]) => !SEVERITIES.has(s));
  if (badSev.length) return { error: { message: `bad severity for: ${badSev.map(([k]) => k).join(', ')} (use error|warn|off)` } };
  const merged = { ...DEFAULT_CONFIG, ...user };
  return { config: {
    vaultPath: resolve(vaultPath), roots: merged.roots, index: merged.index, sourceDir: merged.sourceDir,
    typeByDir: merged.typeByDir || {}, minOutboundLinks: merged.minOutboundLinks,
    inferredThreshold: merged.inferredThreshold, confidenceFloor: merged.confidenceFloor,
    inferredSkipTypes: merged.inferredSkipTypes || [],
    halfLives: { ...DEFAULT_HALF_LIVES, ...(user.halfLives || {}) },
    asOf: merged.asOf || null, rules,
  } };
}
