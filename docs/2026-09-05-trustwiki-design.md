# trustwiki — Design Spec

Date: 2026-09-05 · Status: APPROVED & IMPLEMENTED · Predecessor: PLAN.md v0.1 (direction approved)
Framework constraint: sell discipline + living proof; not a magic pipeline.
Locked decisions: `trustwiki` name / CLI-first / EN-first + zh full.

---

## 1. Goals & non-goals

**Goals**
- G1: anyone can run `npx trustwiki lint` on any markdown knowledge base within
  30 seconds and get a trust-defect report (citations, contradictions, rot).
- G2: any agent (Claude Code / Codex / OpenClaw / ZCode) can install SKILL.md
  and maintain a knowledge base under the same discipline.
- G3: citation grammar, provenance fields, and contradiction marking become an
  open, versioned specification (schema/) that other tools MAY implement.
- G4: every number in README and proof/ is traceable (the methodology
  demonstrating itself).

**Non-goals (v1)**
- Not doing: ingest production pipeline, cron automation, mail/IMAP, public
  projection, `--fix` auto-repair, editor plugins, cloud service, multi-language
  docs (README zh mirror excepted).
- Not promising: auto-"growing" a knowledge base. The tool detects lies; it
  does not think for you.

## 2. Architecture overview

```
user view:
  vault (markdown directory)
    └─ npx trustwiki lint ./vault [--json]   ← cli/: the only executable entry
         ├─ reads .trustwiki.json (defaults when absent)
         ├─ walk → per-rule checks → report (text | json)
         └─ exit 0 (no error) / 1 (has error) / 2 (config error)

agent view:
    install SKILL.md → write/edit the vault under the four-phase discipline
    → run lint before commit (same engine)
```

Four components, two reuse lines: cli is the instrument, SKILL.md the manual,
schema the shared spec, templates the demo & starter. **The lint engine is the
only real engineering**; the rest is documentation and packaging.

## 3. Component design

### 3.1 cli/ — lint engine (v1 main body)

Baseline: the private `wiki/scripts/wiki-lint.mjs` (599 lines) — full rules but
coupled to private conventions (`ACTIVE_ROOTS`, `index.md`, directory stats,
`raw/` parsing all hardcoded).

**Generalization: `.trustwiki.json` config at vault root (all optional)**

```jsonc
{
  "roots": ["notes", "sources"],        // scanned directories (default ["."])
  "index": "index.md",                  // declares index rules on
  "sourceDir": "sources",               // resolution root for citation paths
  "rules": {                            // each: error | warn | off
    "frontmatter.required": "error",
    "frontmatter.fields": "error",
    "link.broken": "error",
    "link.index-missing": "warn",       // needs index
    "link.type-mismatch": "warn",
    "page.orphan": "warn",
    "citation.malformed": "error",
    "citation.target-missing": "error", // needs sourceDir (else roots-relative)
    "provenance.excess-inferred": "warn",
    "provenance.low-confidence": "warn",
    "provenance.contradicted": "warn",
    "placeholder.present": "warn"
  }
}
```

**Graceful degradation**: no `index` → index rules skip with a report notice;
no `sourceDir` → citation targets resolve roots-relative. **Zero-config must
work** — install-and-run is the first conversion gate.

**Code structure** (extracted from wiki-lint.mjs, ≤700 lines + tests):

```
cli/
├── bin.js               # arg parsing, exit codes, --json
├── config.js            # .trustwiki.json load + defaults + validation (error → exit 2)
├── walk.js              # directory traversal (private filters removed)
├── frontmatter.js       # parser (multiline values / lists supported)
├── links.js             # wikilink parse + link graph
├── citations.js         # citation grammar parser (spec §3.2)
├── resolve.js           # target resolution + realpath vault containment
├── rules/*.js           # one rule per file: { id, run(vault, config) → findings[] }
└── report.js            # text (human, file:line) + json (machine, CI)
```

**CLI contract**:
- `npx trustwiki lint <path>`; `--json` emits a findings array; `--config <file>` overrides.
- finding: `{rule, severity, file, line, message, hint}` — `hint` is a one-line repair suggestion.
- exit: 0 = no errors; 1 = ≥1 error (warnings never affect exit); 2 = config/usage error.

### 3.2 schema/ — open specification (the citation grammar is the core asset)

`schema/spec.md` (EN) + `schema/spec.zh.md`, versioned `trustwiki-schema v0.1`.

**Citation grammar (frozen for v0.1)**:

```
citation   := "^[" source-list "]"
source-list:= source ( ", " source )*
source     := path ( line-ref | anchor-ref )?
path       := vault-relative path, .md suffix optional
line-ref   := ":" start "-" end        (e.g. ^[sources/abc.md:42-58])
anchor-ref := "#L" start "-L" end     (e.g. ^[sources/abc.md#L42-L58])
```

Rules: citations attach to prose paragraph endings only; never headings, list
items, code blocks (spec states it; lint checks heuristically). Uncited
inference is allowed above zero but flagged when over the page threshold
(`provenance.excess-inferred`, default warn, threshold configurable).

**Frontmatter spec**: required = `title, created, updated, type, tags`;
source pages add `source_url, ingested, sha256`; optional provenance =
`confidence (0-1 float), provenance_state (extracted|merged|inferred|ambiguous),
contradicted_by (list)`.

**Contradiction marking**: body callout `> [!contradiction] see [[x]] …` +
frontmatter `contradicted_by` written both ways; lint's
`provenance.contradicted` checks consistency — distilled from real maintenance
incidents, the rationale documented in the spec.

### 3.3 SKILL.md — the method body

Distilled from the private 752-line workflow to ≤200 lines, all private ops
removed (inbox scoring, SHA-256 incremental storage, WeChat/mail), keeping the
portable discipline skeleton:

1. **Ingest**: sources land first (frontmatter with source_url/ingested/sha256),
   body never modifies the source's words.
2. **Synthesize**: new pages need ≥2 outbound links + a backlink to the raw
   source; prose paragraphs carry citations; inference is marked as inference.
3. **Evolve**: every edit bumps `updated`; conflicts get contradiction marks
   instead of silent rewrites; index stays in sync with pages.
4. **Gate**: run lint before declaring done; completion = 0 errors.

Each phase ends with a real "violation consequence" example (sanitized from
maintenance records, e.g. the index glued-line incident) — the reason a rule
exists travels better than the rule.

### 3.4 templates/

- **starter-vault/**: `index.md` + `notes/` + `sources/` + `.trustwiki.json`
  (minimal, 0 errors out of the box) + example pages (one cited, one inference-marked, one contradiction pair).
- **demo-vault/**: seeded-defect vault, simultaneously the golden test fixture
  and the GIF script:

| seeded defect | rule triggered | GIF shot |
|---|---|---|
| prose paragraph uncited over threshold | provenance.excess-inferred | yellow warning |
| citation points to a missing file | citation.target-missing | red error |
| citation syntax broken (`^[abc]`, no path) | citation.malformed | red error |
| a contradiction pair | provenance.contradicted | highlight + "conflict surfaced" |
| [[broken-link]] | link.broken | red error |
| (fix demo) citation corrected | — | all green + exit 0 |

## 4. Error handling

- Unparseable frontmatter: `frontmatter.required` finding (no crash;
  frontmatter-dependent rules skip that file, body rules still run).
- Invalid config JSON / unknown rule id: stderr message + exit 2 (never
  silent degradation).
- Huge vaults: streaming walk (inherited); no caching/parallelism in v1 (YAGNI).

## 5. Testing strategy

1. **Unit**: citations.js (grammar edges: multi-source, line ranges, suffixless
   paths, invalid input), frontmatter.js (multiline, lists, corrupt blocks),
   links.js (`[[x|y]]`, cross-directory, anchors).
2. **Golden**: every seeded demo-vault defect asserts one finding
   (exact file:line:rule) — fixture = demo = test, one maintenance cost.
3. **Dogfood**: this repo's docs linted by its own engine in CI; README/STATS
   numbers re-verified by CI scripts (G4 mechanized).
4. **Migration parity**: the private wiki as regression set (local runs only,
   never committed) — the generalized linter must not lose any warning
   category that wiki-lint fires on it.

## 6. Milestones

| phase | content | acceptance | est. |
|---|---|---|---|
| M1 | cli core: config/walk/frontmatter/links/citations + 5 core rules + golden | demo-vault runs end to end | 2-3 days |
| M2 | all 12 rules + --json + migration parity | parity OK vs private wiki | 1-2 days |
| M3 | schema spec + SKILL.md + starter/demo templates + docs | dogfood CI green | 1-2 days |
| M4 | bilingual README + GIF + proof/STATS + npm name + release pack | 30s run on a clean machine | 1 day |

## 7. Pre-launch hard gates

- npm `trustwiki` name check (GitHub was clear; npm verified at launch).
- Every README/STATS number carries source + verification date (page count
  from lint actual; the index-lines-vs-AGENTS.md discrepancy resolved first).
- Zero private content on the open-source surface (schema/skill/templates
  sanitized; public-boundary re-check).
- Operating-since wording unified: "operating since 2026-05" (never "a year").

## 8. Post-launch record (appended during execution)

- Migration parity executed 2026-09-05: PARITY OK (3 categories covered; the
  stricter defaults report 15,052 findings on the same vault). Found and fixed
  a real bug during migration: `process.exit()` truncated large stdout on
  pipes — use `exitCode`.
- Evaluation round 1 (see docs/eval/precision-2026-09-05.md): precision 49%
  before → ~93% after location-based source-page exemptions. Precision is
  earned by subtraction.
- Codex final review (16 findings) and scheduled Codex re-review (16 findings,
  10 confirmed first-hand) — both fix-waved with regression tests; 53 tests
  green at closure.
