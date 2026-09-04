#!/usr/bin/env node
import { loadConfig } from './config.js';
import { lintVault } from './engine.js';
import { formatText, formatJson } from './report.js';

const args = process.argv.slice(2);
if (args[0] !== 'lint' || !args[1] || args[1].startsWith('--')) {
  console.error('usage: trustwiki lint <vault-path> [--json] [--config <file>]');
  process.exit(2);
}
const vault = args[1];
const json = args.includes('--json');
const configFlag = args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined;
const { config, error } = await loadConfig(vault, configFlag);
if (error) { console.error(`trustwiki: ${error.message}`); process.exit(2); }
const findings = await lintVault(config.vaultPath, config);
console.log(json ? formatJson(findings) : formatText(findings));
// exitCode (not process.exit) so large stdout writes flush before teardown
process.exitCode = findings.some(f => f.severity === 'error') ? 1 : 0;
