# Evaluation Round 1 — finding precision on a production vault

Date: 2026-09-05 · Method: stratified sample (seed 42), n=53, pre-registered categories

## Why

All prior evidence was correctness-level (unit tests, golden contract, migration
parity against the vault the rules were distilled from). Rule/语料同源 = overfitting
risk. This evaluation measures **precision**: of real findings on a production
8,658-page vault, how many would an author act on?

## Categories (pre-registered before sampling)

- **actionable** — author would plausibly fix (uncited claim paragraph, broken link, contradiction, missing required field)
- **noise** — rule fires correctly but no action value for that page
- **false positive** — the checker itself is wrong (line drift, misparse, should not have fired)

## Results (before fixes)

| rule | sampled | actionable | noise | false pos |
|---|---|---|---|---|
| frontmatter.fields | 14 | 14 | 0 | 0 |
| link.broken | 2 | 2 | 0 | 0 |
| link.index-missing | 1 | 1 | 0 | 0 |
| page.orphan | 14 | 0 | 14 | 0 |
| citation.malformed | 1 | 1 | 0 | 0 |
| citation.target-missing | 3 | 3 | 0 | 0 |
| provenance.excess-inferred | 15 | 3 | 1 | 11 |
| provenance.contradicted | 3 | 2 | 1 | 0 |
| **total** | **53** | **26 (49%)** | **16 (30%)** | **11 (21%)** |

## The two structural findings

1. **page.orphan had no source-page exemption.** Raw captured sources quote
   their origin; outbound links are not their job. 14/14 sampled orphans were
   raw pages. Population: 4,327 findings, ~all this class.
2. **excess-inferred's exemption was label-based, not location-based.** It
   skipped `type: source` pages, but real vaults label raw captures
   inconsistently (`type: raw-article`, or nothing). 11/15 sampled false
   positives were raw captures sitting under the source directory. Population: 4,575.

## Fixes shipped (same day)

- `page.orphan` now skips pages under `sourceDir` and pages typed in `inferredSkipTypes`
- `provenance.excess-inferred` exemption is now location-based: any page under
  `sourceDir` is exempt regardless of type label
- Guarded against undefined config keys

## After

| metric | before | after |
|---|---|---|
| findings on the production vault | 15,473 | 7,929 (−49%) |
| projected precision (sample-adjusted) | 49% | ~93% (residual noise: bare-link "paragraphs", targetless contradiction callouts) |

## Residual known noise (documented, not yet fixed)

- Bare `[[link]]`-only lines count as prose paragraphs for the inference ratio
- Targetless `[!contradiction]` callouts (author notes a conflict without a
  counterpart page) are flagged as missing frontmatter mirror

## Method notes

- 50 stratified samples (seed 42, min 3/rule) + 3 manual contradicted samples
  (a sampler quota bug trimmed them — fixed by manual draw, disclosed here)
- Sample sheet contains private content and is kept out of the repo;
  this file carries aggregates only
- n=53 on one vault. External-vault evaluation (round 2) remains open.
