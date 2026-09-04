import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'bin.js');
const demo = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'demo-vault');

test('--json emits a parseable findings array; exit code is 1 (errors present)', () => {
  let out, code = 0;
  try { out = execFileSync('node', [bin, 'lint', demo, '--json'], { encoding: 'utf8' }); }
  catch (e) { out = e.stdout; code = e.status; }
  const parsed = JSON.parse(out);
  assert.ok(Array.isArray(parsed) && parsed.length === 8);
  assert.ok(parsed.every(f => ['rule', 'severity', 'file', 'line', 'message', 'hint'].every(k => k in f)));
  assert.equal(code, 1);
});

test('usage error exits 2', () => {
  try { execFileSync('node', [bin], { encoding: 'utf8' }); assert.fail('should exit 2'); }
  catch (e) { assert.equal(e.status, 2); }
});
