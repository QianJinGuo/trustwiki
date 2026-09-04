import { readFile } from 'node:fs/promises';
import { walkVault } from './walk.js';
import { parseFrontmatter } from './frontmatter.js';
import { extractWikilinks } from './links.js';
import { findCitations } from './citations.js';
import { RULES } from './rules/index.js';

export function normalizeTarget(t) { return t.trim().replace(/\.md$/, ''); }

export function resolveTarget(t, cfg) {
  const cands = [t, `${t}.md`];
  if (cfg.sourceDir) cands.push(`${cfg.sourceDir}/${t}`, `${cfg.sourceDir}/${t}.md`);
  return cands;
}

function proseParagraphs(body, bodyStartLine) {
  const out = [];
  for (const block of body.split(/\n[ \t]*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const first = trimmed.split('\n')[0];
    const isProse = !/^(#|>|-\s|\||```|\d+\.\s)/.test(first);
    const startLine = bodyStartLine + body.slice(0, body.indexOf(block)).split('\n').length - 1;
    out.push({ text: trimmed, startLine, cited: trimmed.includes('^['), isProse });
  }
  return out;
}

export async function lintVault(vaultPath, config) {
  const files = await walkVault(vaultPath, config.roots, config.index);
  const model = { vaultPath, config, files: [], indexEntries: null, degraded: [] };
  model.filePaths = new Set(files);
  if (config.index) {
    try {
      const raw = await readFile(join(vaultPath, config.index), 'utf8');
      model.indexEntries = new Set([...raw.matchAll(/\[\[([^\]|\n]+)/g)].map(m => normalizeTarget(m[1])));
      model.indexRaw = raw;
    } catch {
      model.indexEntries = null; // index configured but unreadable → degrade
    }
  }
  for (const rel of files) {
    const text = await readFile(join(vaultPath, rel), 'utf8');
    const fm = parseFrontmatter(text);
    const bodyStartLine = fm.bodyStartLine;
    model.files.push({
      relPath: rel, text, fm, body: fm.body, bodyStartLine,
      links: extractWikilinks(fm.body, bodyStartLine),
      ...findCitations(fm.body, bodyStartLine),
      paragraphs: proseParagraphs(fm.body, bodyStartLine),
    });
  }
  const findings = [];
  for (const rule of RULES) {
    const severity = config.rules[rule.id];
    if (!severity || severity === 'off') continue;
    if (rule.needs === 'index' && !model.indexEntries) { model.degraded.push(rule.id); continue; }
    for (const f of rule.run(model)) {
      findings.push({
        severity, rule: rule.id,
        file: f.file ?? '', line: f.line ?? 1,
        message: f.message, hint: f.hint ?? '',
      });
    }
  }
  return findings;
}

import { join } from 'node:path';
