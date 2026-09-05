# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/); versioning: semver, `0.x` = unstable.

## [0.2.0] — 2026-09-05

Claim half-life annotation: v0.1 answered "does this claim have a citation";
v0.2 answers "is this claim past its prime".

### Added

- `provenance.stale-claim` rule — source pages declare a half-life class
  (`claim_class: model-generation`) or direct override (`halflife_days: 59`);
  cited paragraphs held past the half-life are flagged with the held duration
- `halfLives` config key — claim-class → days mapping; defaults measured on
  the author's production wiki (terminology 30d, model-generation 59d,
  release-expectation 110d)
- `asOf` config key — audit "as of" a past date; makes runs deterministic
- schema bumped to `trustwiki-schema v0.2` (additive: `claim_class`,
  `halflife_days` frontmatter fields; nothing from v0.1 changed)
- demo-vault gained a staleness fixture (golden contract now 9 findings)

## [0.1.1] — 2026-09-05

Foreign-idiom compatibility release, driven by the round-2 external-vault
evaluation (docs/eval/round2-external-vaults.md).

### Fixed

- `[[label]](url)` reference-style links (MediaWiki-ish display labels) no
  longer parse as broken wikilinks
- Inline HTML tag content (`<tt>`, `<code>`, …) is masked like code spans —
  regex literals such as `^[a-zA-Z]*$` in HTML cells no longer read as citations
- Placeholder detection is case/position-sensitive: bare lowercase "todo" in
  prose (Spanish "todo", domain terms like "to-do list entity") no longer
  fires; `TODO`, `FIXME`, `TBD` in caps and colon-anchored forms still do

### Measured effect

Foreign-corpus wrong-frame findings dropped from ~54,000 to single digits
(>99.9%) across 8 public corpora; real TODO/FIXME markers are still found.

## [0.1.0-alpha.0] — 2026-09-05

First public alpha. npm tag `alpha` (not `latest` yet).

### Added

- `npx trustwiki lint ./vault` — 12 mechanical checks for agent-maintained markdown vaults:
  citation grammar and targets, uncited-inference ratio, confidence floor,
  contradiction consistency, broken/ambiguous links, index drift (both directions),
  orphans, frontmatter presence/values, placeholders
- `trustwiki-schema v0.1` — frozen open specification: claim-level citation grammar,
  provenance frontmatter, contradiction marking (schema/spec.md; zh mirror schema/spec.zh.md)
- `SKILL.md` — the four-phase method (Ingest → Synthesize → Evolve → Gate) as an installable agent skill
- `templates/demo-vault` — seeded-defect fixture; doubles as the golden test contract (8 findings)
- `templates/starter-vault` — clean starting vault
- `--json` output for CI; exit codes 0 (clean) / 1 (errors) / 2 (usage or config)
- Source-page exemptions are location-based (`sourceDir`) as well as label-based —
  see docs/eval/precision-2026-09-05.md for the measurement behind this design

[0.1.0-alpha.0]: https://github.com/QianJinGuo/trustwiki/releases/tag/v0.1.0-alpha.0
