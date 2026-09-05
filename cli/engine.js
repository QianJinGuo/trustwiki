import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { walkVault } from './walk.js';
import { parseFrontmatter } from './frontmatter.js';
import { extractWikilinks } from './links.js';
import { findCitations } from './citations.js';
import { normalizeTarget } from './resolve.js';
import { RULES } from './rules/index.js';

export { normalizeTarget };

// Mask fenced code blocks and inline code spans so their contents are never
// treated as live citations/wikilinks. Character- and line-preserving: every
// line number in the masked text matches the original file. Fence state tracks
// the delimiter type — a ``` line inside a ~~~ fence is content, not a closer.
export function maskCode(body) {
  const lines = body.split('\n');
  const fenceRe = /^\s*(`{3,}|~{3,})/;
  let fenceMark = null;
  const masked = lines.map(line => {
    const m = line.match(fenceRe);
    if (m) {
      const mark = m[1][0];
      if (!fenceMark) { fenceMark = mark; return ''; }
      if (mark === fenceMark) { fenceMark = null; }
      return '';
    }
    if (fenceMark) return '';
    // mask inline HTML tag content (<tt>, <code>, <kbd>…) — regex literals like
    // ^[a-zA-Z]*$ live there in real-world docs (k8s CEL reference)
    return line
      .replace(/<([a-z][a-z0-9]*)\b[^>]*>([\s\S]*?)<\/\1>/gi,
        (_, tag, inner) => `<${tag}>${' '.repeat(inner.length)}</${tag}>`)
      .replace(/`[^`\n]*`/g, x => '`' + ' '.repeat(Math.max(0, x.length - 2)) + '`');
  });
  return masked.join('\n');
}

function proseParagraphs(masked, bodyStartLine) {
  const out = [];
  const countNL = s => (s ? s.split('\n').length - 1 : 0);
  let offset = 0;
  for (const part of masked.split(/(\n[ \t]*\n)/)) {
    const start = offset;
    offset += part.length; // separators are captured parts too
    const trimmed = part.trim();
    if (!trimmed || /^\n[ \t]*\n$/.test(part)) continue;
    const isProse = !/^(#|>|-\s|\||```|\d+\.\s)/.test(trimmed.split('\n')[0]);
    const lead = part.slice(0, part.indexOf(trimmed));
    const startLine = bodyStartLine + countNL(masked.slice(0, start)) + countNL(lead);
    const lastLine = trimmed.split('\n').pop();
    out.push({ text: trimmed, startLine, isProse, lastLine });
  }
  return out;
}

export async function lintVault(vaultPath, config) {
  const files = await walkVault(vaultPath, config.roots, config.index);
  const model = { vaultPath, config, files: [], indexEntries: null, indexLines: null, degraded: [] };
  model.filePaths = new Set(files);
  let indexUnreadable = false;
  if (config.index) {
    try {
      const raw = await readFile(join(vaultPath, config.index), 'utf8');
      const indexMasked = maskCode(raw);
      model.indexRaw = raw;
      model.indexEntries = new Set();
      model.indexLines = new Map();
      const indexLines = indexMasked.split('\n');
      for (let i = 0; i < indexLines.length; i++) {
        for (const m of indexLines[i].matchAll(/\[\[([^\]|\n]+)/g)) {
          const norm = normalizeTarget(m[1].split('#')[0]);
          if (!norm) continue;
          model.indexEntries.add(norm);
          if (!model.indexLines.has(norm)) model.indexLines.set(norm, i + 1);
        }
      }
    } catch {
      model.indexEntries = null;
      indexUnreadable = true; // configured but unreadable — reported, not silent
    }
  }
  for (const rel of files) {
    const raw = await readFile(join(vaultPath, rel), 'utf8');
    const text = raw.replace(/\r\n/g, '\n'); // CRLF normalize; line count preserved
    const fm = parseFrontmatter(text);
    const bodyStartLine = fm.bodyStartLine;
    const body = maskCode(fm.body);
    model.files.push({
      relPath: rel, text, fm, body, bodyStartLine, // body is masked: rules never see code-fence content
      links: extractWikilinks(body, bodyStartLine),
      ...findCitations(body, bodyStartLine),
      paragraphs: proseParagraphs(body, bodyStartLine),
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
  if (indexUnreadable) {
    findings.push({ severity: config.rules['config.index-unreadable'] || 'warn',
      rule: 'config.index-unreadable', file: config.index, line: 1,
      message: 'configured index could not be read; index rules disabled',
      hint: 'check the path or remove the index key from .trustwiki.json' });
  }
  return findings;
}
