import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const RULE_IDS = [
  'frontmatter.required', 'frontmatter.fields', 'placeholder.present',
  'link.broken', 'link.index-missing', 'link.type-mismatch', 'page.orphan',
  'citation.malformed', 'citation.target-missing',
  'provenance.excess-inferred', 'provenance.low-confidence', 'provenance.contradicted',
];

const DEFAULT_SEVERITY = {
  'frontmatter.required': 'error', 'frontmatter.fields': 'error', 'placeholder.present': 'warn',
  'link.broken': 'error', 'link.index-missing': 'warn', 'link.type-mismatch': 'warn', 'page.orphan': 'warn',
  'citation.malformed': 'error', 'citation.target-missing': 'error',
  'provenance.excess-inferred': 'warn', 'provenance.low-confidence': 'warn', 'provenance.contradicted': 'warn',
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
    inferredSkipTypes: merged.inferredSkipTypes || [], rules,
  } };
}
