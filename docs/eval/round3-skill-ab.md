# Evaluation Round 3 — does the SKILL.md method change agent output?

Date: 2026-09-05 · Design: controlled A/B on an identical task
Task: create three themed pages for a team knowledge base from two given
sources (MCP overview; agent-memory landscape). Same brief, same sources.

- **Group A (baseline)**: written the way a competent agent writes by default —
  fluent, organized, no provenance apparatus.
- **Group B (treatment)**: the same task executed by an agent following
  SKILL.md's four phases (Ingest → Synthesize → Evolve → Gate), gates run with
  the real linter until exit 0.

## Results

| dimension | A (no method) | B (SKILL.md method) |
|---|---|---|
| lint result | 3 errors (no frontmatter), more invisible | **0 errors, 0 warnings** (2 real warnings caught on first gate, cleared in Evolve) |
| source traceability | none — no statement can be checked against a source | every claim paragraph carries `^[source.md]`; inference explicitly marked as inference |
| sources preserved | not at all — the two briefs exist only in the prompt | 2 `type: source` pages with `sha256` — silently-edited-source detection enabled from day one |
| knowledge graph | 0 internal links (3 islands) | 11 wikilinks, index with 5 entries, lint-verified both directions |
| silent-slop surface | all three pages are exactly the "fluent prose, zero provenance" failure mode | none: uncited-inference ratio 0% |
| reader trust | "is this true? where did it come from?" — unanswerable | every claim resolvable to one of two named, hashed sources |

## The two warnings Gate caught (and why that matters)

B's first gate produced exactly two warnings: an orphaned page and one
uncited paragraph — both real, both cheap to fix, both fixed before
completion because the Gate defines "done" as 0 errors + owned warnings.
Group A has the same defects (worse: no links at all) but no instrument
exists in its workflow to ever surface them. **The difference between A and
B is not writing skill — it is that B's workflow contains a mirror.**

## Honest scope

- n=1 task, one author-team (this repo's), no blind scoring. The effect
  measured is "the method forces provenance apparatus to exist", which is
  by construction — the interesting empirical claim is that the apparatus
  is **cheap** (B cost roughly 2x tokens of A, mostly the lint loop) and
  the output is mechanically verifiable.
- This is a demonstration with instrumentation, not a scientific study.
  It does however close the loop: SKILL.md's rules → applied to a fresh
  task by an agent → linter verifies the result → claims in README
  ("every claim traces to a source") are true of the output.

Artifacts: `/tmp/skill-exp/a-vault` and `/tmp/skill-exp/b-vault` (throwaway,
not committed); this report carries the measurements.
