import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const helper = fileURLToPath(new URL('../../plugins/pstack/skills/show-me-your-work/scripts/log.sh', import.meta.url));

test('decision log appends without truncating and sanitizes spreadsheet cells', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'pstack-log-'));
  try {
    const file = path.join(directory, 'nested directory', 'decisions.tsv');
    execFileSync('bash', [helper, file, 'start', '=formula', 'why\ncontinued', '+evidence', '@result']);
    const first = readFileSync(file, 'utf8');
    execFileSync('bash', [helper, file, 'verify', '-decision', 'reason\twith\rcells', 'artifact', 'passed']);
    const contents = readFileSync(file, 'utf8');
    assert.ok(contents.startsWith(first));
    const rows = contents.trimEnd().split('\n').map(row => row.split('\t'));
    assert.equal(rows.length, 3);
    assert.ok(rows.every(row => row.length === 6));
    assert.deepEqual(rows[1].slice(1), ['start', "'=formula", 'why continued', "'+evidence", "'@result"]);
    assert.deepEqual(rows[2].slice(1), ['verify', "'-decision", 'reason with cells', 'artifact', 'passed']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});


test('an empty existing decision log receives its header before the first row', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'pstack-empty-log-'));
  try {
    const file = path.join(directory, 'decisions.tsv');
    writeFileSync(file, '');
    execFileSync('bash', [helper, file, 'verify', 'check', 'reason', 'artifact', 'passed']);
    const rows = readFileSync(file, 'utf8').trimEnd().split('\n');
    assert.equal(rows.length, 2);
    assert.equal(rows[0], 'ts\tphase\tdecision\twhy\tevidence\tresult');
    assert.equal(rows[1].split('\t').length, 6);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
