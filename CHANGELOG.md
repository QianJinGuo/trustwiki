# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/); versioning: semver, `0.x` = unstable.

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
