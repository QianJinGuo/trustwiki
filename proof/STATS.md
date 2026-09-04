# Living stats — the proof vault

trustwiki is not a thought experiment: the method runs in production on an
agent-maintained personal knowledge base. Every number below carries its
source and verification date — the same discipline this tool enforces.

| metric | value | source | verified |
|---|---|---|---|
| operating since | 2026-05 | oldest rotation archive `log-2026-05.md` | 2026-09-05 |
| tracked pages | 8,658 | `scripts/wiki-lint.mjs` (the authoritative counter this linter was generalized from) | 2026-09-05 |
| raw source pages | 4,162 | file count under `raw/articles/` | 2026-09-05 |
| lint errors | 0 | same wiki-lint run (92 warnings, exit 0) | 2026-09-05 |
| provenance warnings surfaced by trustwiki | 15,052 | stricter defaults (inference ratio, orphans) on the same vault — see `scripts/parity-check.mjs` | 2026-09-05 |
| automated jobs | ingest + quality pipelines on cron; daily public projection | CRON.md | 2026-09-05 |

The gap between "0 errors" and "15,052 warnings" is the point: the production
vault is clean by its own rules, and trustwiki's stricter defaults still find
rot worth looking at. Diagnosis is a dial, not a verdict.
