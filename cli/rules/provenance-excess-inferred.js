export const rule = {
  id: 'provenance.excess-inferred',
  run(model) {
    const out = [];
    for (const f of model.files) {
      if (!f.fm.ok) continue;
      if (model.config.inferredSkipTypes.includes(f.fm.fields.type)) continue;
      const prose = f.paragraphs.filter(p => p.isProse && p.text);
      if (!prose.length) continue;
      // a paragraph counts as cited only when a citation sits on its final line
      const citedLines = new Set(f.citations.map(c => c.line));
      const uncited = prose.filter(p => !citedLines.has(p.startLine + p.text.split('\n').length - 1));
      if (uncited.length / prose.length > model.config.inferredThreshold) {
        out.push({ file: f.relPath, line: uncited[0].startLine,
          message: `${uncited.length}/${prose.length} prose paragraphs uncited (>${model.config.inferredThreshold})`,
          hint: 'cite sources at paragraph end, or mark the page as inference — unattributed claims erode trust' });
      }
    }
    return out;
  },
};
