const WIKILINK_RE = /\[\[([^\]|\n]+)(?:\|([^\]\n]*))?\]\](?!\s*\()/g;

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
