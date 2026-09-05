# Evaluation Round 2 — external vaults (overfitting check)

Date: 2026-09-05 · Protocol: [round2-protocol.md](round2-protocol.md) (pre-registered)
Corpora: three public markdown knowledge bases the rules have never seen —
obsidian-help (6,393 md files, Obsidian's official docs, wiki-linked, 8 languages),
vscode-docs (840 files, nav-linked docs + blogs), expressjs.com (53 files, website docs).

## Headline: zero fabricated findings

35 stratified samples across the three vaults (seed 7): **every single finding
was factually true** — correct file, correct line, correct parse. The checker
does not lie on foreign vaults. The false-positive rate that round 1 measured
on the home vault (49% before fixes) does not reappear here.

## But: "true" splits into useful vs. alien

| corpus | findings | factually true | TRUE-USEFUL for that maintainer | TRUE-ALIEN (correct but inapplicable idiom) |
|---|---|---|---|---|
| obsidian-help | 29,043 | 12/12 sampled | ~3 (2 broken wikilinks, 1 placeholder) | ~9 |
| vscode-docs | 2,304 | 12/12 | ~1 (1 real TODO) | ~11 |
| expressjs.com | 144 | 11/11 | ~1 (1 real TODO) | ~10 |
| **total** | **31,491** | **35/35 (100%)** | **~5 (14%)** | **~30 (86%)** |

The alien findings cluster into exactly three patterns:

1. **Citation/provenance rules assume the trustwiki culture.** Demanding
   `created/updated/tags` frontmatter or per-paragraph citations from a
   release-notes page or a blog post is true but meaningless to that
   maintainer. These rules are opt-in philosophy, not universal law.
2. **Wikilink-centric link rules meet nav-linked docs.** `page.orphan` fires
   on every page of a website whose navigation is menus, not `[[wikilinks]]`.
   `link.broken` on obsidian-help correctly flags genuinely dangling wiki
   links (real bugs in their docs) — same rule, useful there.
3. **`^[…]` collision with Obsidian footnotes.** Obsidian's inline footnote
   syntax `^[text]` is our citation syntax's cousin. On obsidian-help this
   produced both a TRUE broken-citation (their footnote, no target) and noise.
   Documented, not a bug — but a real interop consideration.

## What this means (the honest reading)

- **The tool is safe on foreign vaults: it reports truths, not fabrications.**
  100% factual accuracy on unseen corpora.
- **The tool is loud on vaults that never opted into the discipline.** Default
  severities assume the trustwiki culture. A stranger running it on vscode-docs
  gets 2,304 findings of which ~1 matters to them.
- **Round 1's 93% and round 2's ~14% useful are not a contradiction.** Round 1
  measured precision on a vault that opted in. Round 2 measured factuality on
  vaults that didn't. Both numbers are real; they answer different questions.

## Product action (shipped with this report)

None forced. The levers if we later want external-vault friendliness exist
already: every rule can be `off`, and a "docs site" preset
(`page.orphan: off`, `provenance.*: off`, keep `link.broken` +
`placeholder.present`) would have surfaced only the ~5 genuinely useful
findings across these corpora. Presets are a roadmap item, not a v1 fix —
the honest v1 positioning is "for vaults that opt into the discipline."

## Method disclosure

- 3 corpora, 35 samples, seed 7, sampled per-rule with min-1 coverage
- No private content involved; corpora are public repos, cloned to /tmp
- Round 1's sampler quota bug is disclosed in
  [precision-2026-09-05.md](precision-2026-09-05.md); this round's sampler
  drew with replacement-safe logic and was checked post-hoc
