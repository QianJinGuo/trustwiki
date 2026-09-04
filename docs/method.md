# The trustwiki method — one rule, twelve checks

The one rule: **never write a claim your vault cannot trace.** Agent-written
knowledge bases fail in predictable ways; each rule below exists because its
failure mode was observed, repeatedly, in production. Grouped by what they
protect.

## Truth

### citation.malformed
A citation that doesn't parse is decoration, not provenance. The check
validates every `^[…]` against the grammar in `schema/spec.md` (path, optional
`:42-58` or `#L42-L58` range, comma-separated multi-source).
*Incident class:* hand-written citations that "look right" but were never
resolvable — the visual signature of provenance without the substance.

### citation.target-missing
Every cited path must exist in the vault. A citation pointing at a file that
isn't there is a lie with a hair cut.
*Incident class:* pages renamed or archived without sweeping their backlinks.

### provenance.excess-inferred
Inference is legitimate; invisible inference is not. When more than the
threshold (default 30%) of a page's prose paragraphs carry no citation, the
page is flagged. Source pages (`type: source`) are exempt — they quote, they
don't cite themselves.
*Incident class:* the slop-vault — fluent, confident prose that no source
can confirm. This is the failure mode people mean when they say "AI slop".

### provenance.low-confidence
Pages may declare `confidence: 0–1`. Below the floor (default 0.5) the page
is flagged so weak claims are visible at a glance.

## Conflict

### provenance.contradicted
When two pages disagree, the disagreement is data. The rule enforces the
two halves: a `> [!contradiction]` callout in the body **and** a
`contradicted_by` list in frontmatter — either half alone is flagged,
because machines read frontmatter and humans read prose.
*Incident class:* a contradiction quietly rewritten away, then rediscovered
six weeks later by someone re-deriving the same wrong conclusion.

## Structure

### link.broken
Every `[[wikilink]]` must resolve — by exact path or unique basename.
### link.index-missing
Every page must appear in the index; every index entry must resolve.
*Incident class:* index corruption — entries glued onto one line by a bad
edit, silently dropping every second page from navigation.
### link.type-mismatch
If you declare expected `type` per directory, pages must match it.
### page.orphan
Fewer than `minOutboundLinks` (default 2) outbound links → flagged. Islands
rot first.
### frontmatter.required / frontmatter.fields
No frontmatter, or missing required fields (`title, created, updated, type,
tags`; sources add `source_url, ingested, sha256`) — flagged. The sha256 is
how a silently edited source is caught months later.
### placeholder.present
`TODO`/`TBD`/`FIXME` in the first twenty body lines. Unfinished content that
looks finished erodes trust in everything around it.

## The operating loop

Ingest → Synthesize → Evolve → Gate. See `SKILL.md` for the agent-facing
method; see `schema/spec.md` for the frozen grammar. Chinese version:
`docs/method.zh.md`.
