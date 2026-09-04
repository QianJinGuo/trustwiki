---
name: trustwiki
description: Use when an agent creates or edits pages in a trustwiki-style
  knowledge base — enforces claim-level citations, contradiction marking,
  index hygiene, and pre-commit linting so agent-maintained knowledge stays
  trustworthy. Covers the four-phase method (Ingest → Synthesize → Evolve → Gate).
---

# trustwiki — the discipline for agent-maintained knowledge bases

## The one rule

**Never write a claim your vault cannot trace.**

Everything below is this rule made mechanical. If you remember only one
line, remember that one.

## Phase: Ingest

Sources land before opinions do.

1. Create a source page under the source directory (`type: source`) with
   `source_url`, `ingested`, and `sha256` in frontmatter.
2. The body holds the source's own words. Never paraphrase into the raw
   page — the raw page is evidence, and evidence does not get edited.

**Violation consequence:** without the capture-time `sha256`, a silently
edited source is undetectable. You will cite a page whose claims changed
under you, and no instrument can tell you.

## Phase: Synthesize

Every synthesized page:

1. Carries at least two outbound wikilinks — pages that reference nothing
   are orphaned islands, and islands rot first.
2. Links back to the raw source page it was built from.
3. Ends every prose paragraph with a citation (`^[path.md:42-58]`).
4. Marks inference as inference — `provenance_state: inferred` and no fake
   citations. A citation that does not trace is worse than no citation.

**Violation consequence:** see `templates/demo-vault/notes/sloppy-page.md` —
one page, eight findings. Fluent text with zero provenance is the failure
mode this entire method exists to prevent.

## Phase: Evolve

1. Bump `updated` on every edit. Stale dates are lies about freshness.
2. When two pages disagree, surface the conflict — body callout
   `> [!contradiction]` **and** frontmatter `contradicted_by`. Never resolve
   a contradiction by quietly rewriting one side.
3. Keep the index in sync with the pages. Every page appears in the index;
   every index entry resolves.

**Violation consequence:** index drift is silent — the vault looks fine
until someone follows a dead index entry into a page that no longer exists.

## Phase: Gate

Run the linter before declaring any vault operation complete:

```bash
npx trustwiki lint ./vault
```

- `exit 0` — done (warnings allowed, but list them).
- `exit 1` — errors remain; fix them before continuing.
- Re-run until clean. "It probably passes" is not a gate.

## Config quick reference

See `schema/spec.md` §Checking your vault. Minimum useful config:

```json
{ "roots": ["notes", "sources"], "index": "index.md", "sourceDir": "sources" }
```
