#!/usr/bin/env node
import { loadConfig } from './config.js';
import { lintVault } from './engine.js';
import { formatText, formatJson } from './report.js';

function usage() {
  console.error('usage: trustwiki lint <vault-path> [--json] [--config <file>]');
}

const args = process.argv.slice(2);
if (args[0] !== 'lint' || !args[1] || args[1].startsWith('--')) {
  usage(); process.exit(2);
}
const vault = args[1];
let json = false, configFlag, bad;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--json') json = true;
  else if (args[i] === '--config') {
    if (i + 1 >= args.length) { bad = '--config requires a file argument'; break; }
    configFlag = args[++i];
  } else { bad = `unknown argument: ${args[i]}`; break; }
}
if (bad) { console.error(`trustwiki: ${bad}`); usage(); process.exit(2); }
const { config, error } = await loadConfig(vault, configFlag);
if (error) { console.error(`trustwiki: ${error.message}`); process.exit(2); }
const findings = await lintVault(config.vaultPath, config);
console.log(json ? formatJson(findings) : formatText(findings));
// exitCode (not process.exit) so large stdout writes flush before teardown
process.exitCode = findings.some(f => f.severity === 'error') ? 1 : 0;
