# Contributing

Thanks for considering a contribution. trustwiki is small on purpose — the bar
is that every change keeps the tool's own promise: **every claim traceable,
every check verified.**

## Development

```bash
git clone https://github.com/QianJinGuo/trustwiki && cd trustwiki
npm install        # no runtime deps; this only wires tooling
npm test           # all tests must pass
```

Requires Node ≥ 18. The package has a **zero runtime dependencies** contract —
do not add any.

## Adding or changing a rule

1. One rule = one file in `cli/rules/`, exporting `{ id, needs?, run(model) }`.
2. Register it in `cli/rules/index.js` and add the id + default severity to
   `cli/config.js` (unknown ids are rejected with exit 2).
3. Add unit tests and, if it changes demo-vault output, update the golden
   contract in `test/golden.test.js` — the fixture is the contract; do not
   loosen assertions to make tests pass.
4. If the rule embodies a design decision, document the "why" in
   `docs/method.md` (and `method.zh.md`).

## Ground rules

- **No private data.** Never commit filesystem paths, vault content, or
  credentials from your own machine. CI and review check this.
- **Estimation discipline.** Changes to severity defaults or exemptions must
  come with measurement (see docs/eval/ for the format) — precision is earned
  by subtraction, and we do not ship vibes.
- **Schema is frozen.** Citation grammar changes require a spec version bump
  and must be additions only.
- Commit style: conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Pull requests

Use the PR template; keep PRs single-purpose. CI must be green (tests +
dogfood lints). One review round is normal — resubmitting without addressing
findings is not.
