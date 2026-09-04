# Living stats — the proof vault

trustwiki is not a thought experiment: the method runs in production on an
agent-maintained personal knowledge base. Every number below carries its
source and verification date — the same discipline this tool enforces.

| metric | value | source | verified |
|---|---|---|---|
| operating since | 2026-05 | oldest rotation archive `log-2026-05.md` | 2026-09-05 |
| tracked pages | TBD-AT-LAUNCH | `node scripts/wiki-lint.mjs` actual count (index header disagrees — resolved at launch) | — |
| raw source pages | TBD-AT-LAUNCH | file count under `raw/articles/` | — |
| lint errors | TBD-AT-LAUNCH | same run | — |
| contradiction pairs tracked | TBD-AT-LAUNCH | `wiki-contradiction-scan` output | — |
| automated jobs | ingest + quality pipelines on cron, daily public projection | CRON.md | 2026-09-05 |

`TBD-AT-LAUNCH` rows are filled from a fresh run of the private vault at
release time; they are the only deferred numbers in this repo.
