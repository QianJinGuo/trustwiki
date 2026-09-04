const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const clean = s => String(s).replace(CONTROL, '');

export function formatText(findings) {
  const lines = [];
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, fs] of [...byFile.entries()].sort()) {
    lines.push(clean(file));
    for (const f of fs.sort((a, b) => a.line - b.line)) {
      lines.push(`  L${String(f.line).padEnd(4)} ${f.severity.padEnd(5)} ${clean(f.rule).padEnd(30)} ${clean(f.message)}`);
      if (f.hint) lines.push(`      ↳ ${clean(f.hint)}`);
    }
  }
  const errors = findings.filter(f => f.severity === 'error').length;
  const warns = findings.filter(f => f.severity === 'warn').length;
  lines.push(`Σ ${errors} error${errors === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'} across ${byFile.size} file${byFile.size === 1 ? '' : 's'}`);
  return lines.join('\n');
}

export function formatJson(findings) { return JSON.stringify(findings, null, 2); }
