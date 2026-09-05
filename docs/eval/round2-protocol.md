# Eval round 2 — pre-registered triage categories (external vaults)

Fixed before sampling. Round 2 question differs from round 1: not "would the
author act" (these vaults don't use trustwiki's discipline), but:

**R2-1: Is each finding factually correct?** (the tool says a true thing
about the file — no misparse, no wrong line, no phantom target)

**R2-2: Would a maintainer of that vault plausibly care?** For external
vaults that never signed up for the provenance discipline, "inapplicable
philosophy" is NOT a false positive — the finding must still be TRUE.
But noisy truth (e.g. "orphan" on a website where pages are linked by nav
menus, not wikilinks) degrades signal and must be counted.

Verdicts:
- TRUE-USEFUL    — factually correct AND a maintainer would plausibly fix
- TRUE-NOISE     — factually correct but inapplicable to this vault's idiom
  (wikilink-centric rules on nav-linked docs, frontmatter culture mismatch)
- FALSE          — factually wrong (misparse / wrong line / phantom)

Precision (round 2) := TRUE-USEFUL + TRUE-NOISE ... reported separately from
FALSE. The number we publish is the FALSE rate: a checker that lies on
foreign vaults cannot be trusted on yours.
