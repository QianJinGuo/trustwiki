# Security Policy

## Supported versions

| version          | supported |
|------------------|-----------|
| 0.1.0-alpha.x    | ✅        |
| < 0.1.0          | ❌        |

## Reporting a vulnerability

Use GitHub's **Private vulnerability reporting** (Security tab → Report a vulnerability).
Do not open a public issue for security reports.

## Scope

trustwiki is a local CLI that reads markdown files from a user-provided directory
and writes a report to stdout. Security-relevant surfaces include, non-exhaustively:

- **Path containment** — citation targets and index entries must not escape the
  vault root (`resolveInVault` enforces this; regression tests in test/fixes.test.js)
- **Output injection** — file names and messages from untrusted vaults must not
  carry control characters into terminal output (sanitized in cli/report.js)
- **Dependency-free supply chain** — the package has zero runtime dependencies by contract

Response target: acknowledgment within 7 days, fix or mitigation within 30 days
for anything that lets a malicious vault read files outside its root or execute code.
