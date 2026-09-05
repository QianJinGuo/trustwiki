<p align="center">
  <img src="assets/hero.svg" alt="trustwiki — knowledge bases your agent can maintain, without lying to you" width="100%">
</p>

<p align="center">
  <a href="https://github.com/QianJinGuo/trustwiki/actions/workflows/ci.yml"><img src="https://github.com/QianJinGuo/trustwiki/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/trustwiki"><img src="https://img.shields.io/npm/v/trustwiki/alpha" alt="npm v0.1.0-alpha.0"></a>
  <img src="https://img.shields.io/node/v/trustwiki" alt="node >= 18">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license">
</p>

English · [简体中文](README.zh.md)

# trustwiki

**Knowledge bases your agent can maintain — without lying to you.**

Every claim cited. Contradictions surfaced. Rot detected.

```bash
npx trustwiki lint ./your-vault
```

trustwiki is a provenance linter and an operating method for knowledge bases
maintained by AI agents. It does **not** build your wiki. It makes sure that
when your agent does, every claim can be traced to a source, disagreements
stay visible instead of being silently rewritten, and decay is measured —
not discovered two months later.

- **12 mechanical checks** — citation grammar, citation targets, uncited-inference ratio, confidence floor, contradiction consistency, broken links, index drift, orphans, placeholders
- **One config file** — `.trustwiki.json`; nothing configured, everything still runs
- **Zero dependencies** — Node 18+, one command, JSON output for CI
- **Proven in production** — [operating stats](proof/STATS.md) from an agent-maintained wiki running since 2026-05

## Why

Agents are already writing knowledge bases. Without a trust layer they
produce fluent slop: unattributed claims, silent contradiction resolution,
links that rot. trustwiki is the discipline layer — the linter, the schema,
and the method.

## Quick start

```bash
git clone https://github.com/QianJinGuo/trustwiki && cd trustwiki
npx trustwiki@alpha lint templates/demo-vault
```

You get a report like this (exit code 1 — errors present):

![trustwiki linting the seeded demo vault — 8 findings](assets/demo.gif)

```
notes/sloppy-page.md
  L12   error citation.target-missing   citation target not found: sources/ghost.md
  L14   warn  provenance.excess-inferred 3/5 prose paragraphs uncited (>0.3)
  L16   warn  placeholder.present        placeholder text: TODO
  ...
Σ 3 errors, 5 warnings across 3 files
```

The eight findings are seeded in `templates/demo-vault` — a vault built to
fail. `templates/starter-vault` is the same structure built to pass, and is
the starting point for your own vault.

## The schema

The citation grammar (`^[path:42-58]`), provenance frontmatter, and
contradiction marking are specified, versioned, and frozen at
[schema/spec.md](schema/spec.md) (中文版: [spec.zh.md](schema/spec.zh.md)).
Implementations other than this linter are welcome.

## The method

Four phases — **Ingest, Synthesize, Evolve, Gate** — as an installable agent
skill: [SKILL.md](SKILL.md). Why each rule exists:
[docs/method.md](docs/method.md) (中文版: [method.zh.md](docs/method.zh.md)).

## Configuration

Everything is optional. The two keys that matter:

```json
{
  "roots": ["notes", "sources"],
  "index": "index.md",
  "sourceDir": "sources"
}
```

Full reference in [schema/spec.md](schema/spec.md). Rule severities are
`error | warn | off` per rule; exit codes are `0` clean, `1` errors,
`2` usage/config.

## Stats

Numbers from the production vault, each with source and verification date:
[proof/STATS.md](proof/STATS.md).

## License

MIT.
