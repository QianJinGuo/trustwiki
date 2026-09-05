# AGENTS.md — Agent Instructions for This Repository

This file gives AI coding agents (Codex, Claude Code, Cursor, etc.) the
operating rules for working **on trustwiki's own codebase** — not to be
confused with [SKILL.md](SKILL.md), which teaches agents to *use* trustwiki
on knowledge bases.

## What this repo is

`trustwiki` is a zero-dependency Node ≥18 ESM CLI (`npx trustwiki lint ./vault`)
that lints agent-maintained markdown knowledge bases for provenance defects,
plus an open specification (`schema/spec.md`, frozen at `trustwiki-schema v0.1`)
and an agent-installable method ([SKILL.md](SKILL.md)).

## Hard constraints (violating any of these is a failed PR)

1. **Zero runtime dependencies.** `package.json` must have no `dependencies`.
   Dev tooling uses Node built-ins only (`node:test` runner included).
2. **No private data.** Never commit absolute filesystem paths, vault content,
   credentials, tokens, or recovery codes. Grep for `/home/`, `/Users/` before
   every commit; CI and review do too.
3. **Schema is frozen.** The citation grammar in `schema/spec.md` is
   versioned; changes are additions only and require a version bump.
4. **Golden contract.** `templates/demo-vault` must produce exactly the
   findings asserted in `test/golden.test.js`. Never weaken assertions to make
   tests pass; change the fixture only deliberately, with the diff explained.
5. **Exit codes are API.** 0 = clean (warnings allowed), 1 = ≥1 error,
   2 = usage/config error. Warnings never cause exit 1.
6. **Every rule is configurable.** New rules must register an id in
   `cli/config.js` (`RULE_IDS` + default severity) and be file-scoped findings
   with `line: 1`.

## Code layout

```
cli/
  bin.js        entry: arg parsing, exit codes
  config.js     .trustwiki.json loading, RULE_IDS, defaults
  walk.js       vault traversal (roots scoping, index skip)
  frontmatter.js  frontmatter parser (flat + block scalars)
  links.js      wikilink extraction with absolute line numbers
  citations.js  citation grammar v0.1 parser
  resolve.js    target resolution + realpath vault containment
  engine.js     orchestration: mask code fences, CRLF normalize, run rules
  report.js     text/json formatters (control-char sanitized)
  rules/        one file per rule; registry in index.js
templates/      demo-vault (seeded defects) + starter-vault (clean)
test/           node:test; golden + regression suites
docs/eval/      precision evaluations (measurement discipline)
```

## Testing discipline

```bash
npm test        # node --test test/*.test.js  (glob form; directory form breaks on some node 22 builds)
```

- Every bug fix lands with a regression test that fails without the fix.
- Every Codex/external review finding gets a test named for it
  (see `test/rereview.test.js`, `test/fixes.test.js` for the pattern).
- Line numbers are part of the contract: test absolute file lines, not offsets.

## Estimation discipline

Changes to rule severities, exemptions, or new rules must come with
measurement against a real vault, in the format of
[docs/eval/precision-2026-09-05.md](docs/eval/precision-2026-09-05.md):
stratified sample, pre-registered triage categories, disclosed method errors.
Precision is earned by subtraction; we do not ship vibes.

## Conventions

- English-first: code, comments, commit messages, primary docs. Chinese
  mirrors exist only as explicitly named `*.zh.md` files and the language
  switcher — do not mix CJK into other English documents.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Before claiming done: `npm test` green, self-lint clean
  (`node cli/bin.js lint .`), no CJK outside `*.zh.md` and language switchers.
