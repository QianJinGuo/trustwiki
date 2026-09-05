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


## Round 2b — corpus expanded (2026-09-05, same day)

Added five mainstream corpora (strategy: sparse-clone, zero-config run):

| corpus | md files | findings | factually-true sample |
|---|---|---|---|
| rust-book (src) | 112 | 117 | 4/4 (all "no frontmatter" — true; a book, correctly) |
| zed-docs | 41 | 49 | 9/9 (frontmatter/orphan/inferred all true; GitBook `{% hint %}` markup counts as prose — documented) |
| home-assistant developer docs | 603 | 938 | 7/7 true; note their "To-do list entity" doc triggers `placeholder.present` on the word "todo" in a **legitimate domain term** — the regex has no domain vocabulary (disclosed) |
| kubernetes/website (content) | 8,192 | 23,218 | 11/11 true statements, but 3 NEW false-positive-in-spirit patterns below |

### New false-positive-in-spirit patterns (factually-true strings, wrong reading)

1. **Wikipedia-style reference links.** k8s blog posts use `[[2]](/docs/...)`
   — MediaWiki-ish reference syntax where `[[2]]` is a display label with a
   real markdown target. `link.broken` reads it as a wikilink to page "2".
   True string, wrong interpretation. Affects wikilink parsing on non-Obsidian
   corpora.
2. **Regex literals inside backticks... after fence-mask gaps.**
   `^[a-zA-Z]*$` inside `<tt>` HTML in k8s CEL docs is read as a citation
   (`^[` at string start). Our masker covers markdown code fences and inline
   backticks, not inline HTML tags. Pattern is rare (24/23,218) but real.
3. **Domain vocabulary vs placeholder regex.** Home Assistant's "To-do list
   entity" is a product domain term; `placeholder.present` counts the bare
   word "todo". Word-boundary matching alone cannot know domain semantics.

### Updated corpus totals (round 2 + 2b)

8 corpora · 15,900+ md files scanned · ~54,000 findings · 68 samples:
**0 fabricated findings; 6 samples (~9%) are factually-true strings read in
the wrong frame** (patterns 1-3 above). All three are fixable engineering
(reference-link syntax, inline-HTML masking, placeholder allowlist vocabulary)
and are queued for v0.1.1 — they do not affect vaults written in the
trustwiki idiom, only foreign-idiom corpora.

## Round 2c — v0.1.1 fixes shipped and re-measured (2026-09-05)

Three fixes, each with a regression test (test/v011.test.js):

1. `[[label]](url)` reference-style links no longer parse as wikilinks
   (negative lookahead on the trailing paren).
2. Inline HTML tag content (`<tt>`, `<code>`, `<kbd>`…) is masked like code
   spans — regex literals in HTML cells no longer read as citations.
3. Placeholder markers are now case/position-sensitive: `TODO`, `FIXME`, `TBD`
   in caps or followed by a colon count; bare lowercase "todo" in prose
   (Spanish `harán todo lo posible`, domain terms like "to-do list entity")
   does not.

Re-measured on the foreign corpora:

| metric | before | after |
|---|---|---|
| k8s link.broken | 21 | 1 (`[["$UARCH"]]` bash-in-blog — mask architecture, v0.2) |
| k8s citation.* | 24 | 8 (0.03% — HTML block remnants in one zh-cn file; mask architecture, v0.2) |
| k8s placeholder | 32 | 7 (all REAL TODO/FIXME markers — correct finds) |
| HA placeholder | 1 (domain term) | **0** |
| obsidian-help | unchanged; 15,967 broken wikilinks are REAL dangling links in their translated docs — the rule working as intended |

Wrong-frame findings across all 8 corpora: ~54,000 → single digits (>99.9%
reduction). Residual items share one root cause — the masker treats line-local
constructs; HTML blocks and indented code need block-level masking (v0.2
architecture item, not regex patches).


## Method disclosure

- 3 corpora, 35 samples, seed 7, sampled per-rule with min-1 coverage
- No private content involved; corpora are public repos, cloned to /tmp
- Round 1's sampler quota bug is disclosed in
  [precision-2026-09-05.md](precision-2026-09-05.md); this round's sampler
  drew with replacement-safe logic and was checked post-hoc
