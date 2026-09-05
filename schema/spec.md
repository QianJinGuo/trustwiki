# trustwiki-schema v0.2

## Status

`trustwiki-schema v0.2` — 2026-09-05. v0.1 froze the citation grammar; v0.2
adds claim half-life annotation (additive only, nothing from v0.1 changed).
Implemented by the `trustwiki` linter and the `trustwiki` agent skill; other
tools MAY implement it.

## Citation grammar

```
citation    := "^[" source-list "]"
source-list := source ( ", " source )*
source      := path ( line-ref | anchor-ref )?
path        := vault-relative path; the .md suffix is optional
line-ref    := ":" start "-" end        e.g. ^[sources/abc.md:42-58]
anchor-ref  := "#L" start "-L" end      e.g. ^[sources/abc.md#L42-L58]
start, end  := positive integers; start ≤ end
```

Worked examples:

```markdown
Tea brews differently by style.^[sources/tea.md]

Steeping times dominate the bitterness outcome.^[sources/tea.md:42-58]

Both studies agree on the ratio.^[sources/study-a.md, sources/study-b.md#L3-L4]
```

Placement rules:

- Citations attach to the end of prose paragraphs. Never to headings, list
  items, code blocks, or callouts.
- Uncited inference is allowed — knowledge synthesis requires it — but the
  share of uncited prose paragraphs on a page must stay under the configured
  threshold (default 0.3), and honest pages mark inference as inference via
  frontmatter (`provenance_state: inferred`).
- Raw source pages (`type: source`) are exempt from the inference ratio:
  they quote the source, they do not cite themselves.

## Frontmatter

Required on every page:

| field    | type   | notes                          |
|----------|--------|--------------------------------|
| title    | string | human-readable page title      |
| created  | date   | ISO date, set once             |
| updated  | date   | ISO date, bumped on every edit |
| type     | string | page type (e.g. note, source, moc) |
| tags     | list   | `[a, b]`                       |

Additional required on source pages (`type: source` or pages under the
configured `sourceDir`):

| field      | type   | notes                                   |
|------------|--------|-----------------------------------------|
| source_url | string | original URL                             |
| ingested   | date   | when the source was captured             |
| sha256     | string | hash of the raw body at capture time — this is how silent source edits are detected later |

Optional provenance fields:

| field            | type   | notes                                            |
|------------------|--------|--------------------------------------------------|
| confidence       | float  | 0–1; below the floor (default 0.5) is flagged    |
| provenance_state | enum   | `extracted \| merged \| inferred \| ambiguous`   |
| contradicted_by  | list   | slugs of pages that disagree with this one       |
| claim_class      | string | half-life class of this source's claims; must be a key of the vault's `halfLives` config |
| halflife_days    | number | direct half-life override, wins over `claim_class` |

## Contradiction marking

When two pages disagree, the disagreement is surfaced, not resolved away:

1. Body callout at the end of the disagreeing page:
   `> [!contradiction] see [[other-page]] which holds the opposite view`
2. Frontmatter mirror: `contradicted_by: [other-page]`

The linter's `provenance.contradicted` rule requires both halves — a callout
without the frontmatter mirror (or vice versa) is flagged, because
machines read one and humans read the other.

## Checking your vault

```bash
npx trustwiki lint ./your-vault
```

Configuration lives in `.trustwiki.json` at the vault root (all keys optional):

| key                 | default   | meaning                                     |
|---------------------|-----------|---------------------------------------------|
| roots               | `["."]`   | directories that participate in scanning    |
| index               | `null`    | index file; enables index-drift rules       |
| sourceDir           | `null`    | root for citation path resolution           |
| typeByDir           | `{}`      | expected `type` per top-level directory     |
| minOutboundLinks    | `2`       | orphan threshold                            |
| inferredThreshold   | `0.3`     | max share of uncited prose paragraphs       |
| confidenceFloor     | `0.5`     | minimum confidence                          |
| inferredSkipTypes   | `["source"]` | page types exempt from inference ratio   |
| halfLives           | terminology 30 / model-generation 59 / release-expectation 110 | claim-class → days until cited claims are flagged stale |
| asOf                | today | audit "as of" a past date (also makes runs deterministic) |
| rules               | all on    | per-rule `error \| warn \| off`             |

Rule ids: `frontmatter.required`, `frontmatter.fields`, `placeholder.present`,
`link.broken`, `link.index-missing`, `link.type-mismatch`, `page.orphan`,
`citation.malformed`, `citation.target-missing`,
`provenance.excess-inferred`, `provenance.low-confidence`,
`provenance.contradicted`, `provenance.stale-claim`,
`config.index-unreadable`.

### Claim half-lives (v0.2)

Cited claims age. v0.2 lets a source page declare how fast its claims decay:

```yaml
claim_class: model-generation    # resolved via halfLives config
# or directly:
halflife_days: 59
```

`provenance.stale-claim` then flags any cited paragraph whose source has been
held past its half-life: age = audit date − source `ingested` (how long the
vault has HELD the claim). Unclassified or undated sources are never flagged —
the rule does not guess. Default half-lives (30/59/110 days) are measured on
the author's production wiki; override per vault via `halfLives`.

Exit codes: `0` clean (warnings allowed), `1` at least one error,
`2` configuration or usage error.
