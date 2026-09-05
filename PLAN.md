# trustwiki — Repo Plan (v0.1, superseded by the design spec; kept for the decision record)

Date: 2026-09-05 · Status: EXECUTED · Framework: the four-item assessment, corrected form
**Sell discipline + living proof; do not sell a magic pipeline.**

---

## 1. Positioning

**One-liner (EN)**: Trustworthy knowledge bases your agent can maintain —
every claim cited, contradictions surfaced, rot detected.

**What it is**: the discipline this wiki ran on for months — claim-level
citation syntax, contradiction detection, lint instrumentation, the
four-phase pipeline (Ingest → Synthesize → Cite → Evolve) — extracted into
an installable agent skill, an `npx` lint CLI, and an open specification.

**What it is not (honest boundaries, stated in the README)**:
- Not a "dump sources, get a wiki" magic — automatic knowledge bases without
  discipline produce beautifully-cited slop (conclusion of the four-item
  assessment, recorded in the project memory).
- Excludes private operations (cron fleet, mail/IMAP, WeChat pipelines,
  public projection scripts) — those are ops running on the author's machine,
  not part of the open-source surface.

## 2. Living proof (numbers verified before launch)

| metric | draft value | source | status |
|---|---|---|---|
| operating since | 2026-05 (logs public, not "a year") | log-2026-05.md | ✅ verified |
| page count | **was ambiguous**: index 6,611 lines vs AGENTS.md claim 8,597 | `node scripts/wiki-lint.mjs` actual | ⚠️ resolved at launch: 8,658 |
| raw source files | 4,126 | AGENTS.md | ⚠️ re-verified: 4,162 |
| lint | 0 errors | last run | ⚠️ run on launch day: 0 |
| contradiction scan | every 12h automatic | CRON.md | ✅ |

> Discipline: every number in the README carries source + verification date.
> This is the methodology demonstrating itself — we sell "every claim
> traceable", so the README goes first.

## 3. Repo structure (v1)

```
trustwiki/
├── README.md              # EN-first + zh mirror; hero = positioning + living numbers
├── SKILL.md               # the method: four phases, installable by any agent
├── cli/                   # npx trustwiki lint ./vault — generalized from wiki-lint (config-driven)
├── schema/                # open spec: frontmatter shapes, citation syntax ^[src.md:42-58],
│                          #   contradiction marking [!contradiction], provenance fields
├── templates/starter-vault/  # clean starting skeleton
├── templates/demo-vault/     # seeded-defect demo (fake citations, missing citations, contradiction pair, orphans)
├── docs/method.md         # why each rule exists (each rule maps to a real rot pattern)
└── proof/STATS.md         # living production stats, links to the public projection
```

**Explicitly not in v1**: cron automation, ingest production pipeline,
multi-language, editor plugins, cloud service.

## 4. Differentiation (who this is legible against)

| neighbor | they answer | we differ |
|---|---|---|
| llm-wiki-agent (3.5k★, toy-grade leader) | dump sources, auto-grow a wiki | we don't race on growth; we race on not rotting |
| Graphify (114.7k★) | codebase → queryable KB | querying existing knowledge vs synthesizing + tracing new knowledge |
| claude-mem (93.2k★) | agent memory | memory for agents vs trustworthy knowledge for humans |
| markdownlint / Vale | prose style | citations and contradictions are the truth layer, not the style layer |

## 5. Launch ammo & checklist

- **Demo GIF (8-15s)**: run `npx trustwiki lint` on demo-vault — fake citation
  caught, contradiction pair surfaces, fix turns it green. The "understandable
  without reading code" acceptance.
- **Show HN title candidates**:
  1. "Show HN: Trustwiki – a discipline for agent-maintained knowledge bases (every claim cited)"
  2. "Show HN: My agent maintains a 8.6k-page wiki. Here's the discipline that keeps it honest"
- **Data shell**: first-hand scans (5,984 SKILL.md hygiene at 1.1% defect rate;
  the wiki's own lint records) as comment-section evidence.
- Distribution order: Show HN (Tue) → V2EX → Jike → X; bilingual README serves both.
- **First-week discipline**: every issue answered same-day for 48h; no version
  promises (honest `v0.x alpha`).

## 6. Risks & boundaries

1. **Zero private leakage**: open-source surface = schema/lint/skill/templates
   (no real notes content); living proof links only to the public projection.
   Public-boundary check re-run before launch (last done 2026-09-03).
2. **Young category**: the LLM-wiki wave may cool — the hedge is that the
   author runs this discipline daily regardless; stars are pure upside.
3. **Lint generalization cost**: wiki-lint.mjs is coupled to private
   conventions; extracting the config layer is the real work (est. 2-4 days),
   the largest engineering item of v1.
4. **Value demonstration threshold**: the discipline's value lands when run —
   demo-vault's seeded defects exist exactly for this.

## 7. Decisions taken

1. **Name**: `trustwiki` (positioning = name, clean on GitHub and npm) — chosen over `wikiwitness`, `wikiforge`.
2. **Face order**: CLI-first (`npx trustwiki lint` in 30s), SKILL.md presented in parallel.
3. **Language order**: EN-first + full zh mirrors.
