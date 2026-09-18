import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./ledger.mjs', import.meta.url));
function fixture(t, workflow = 'repro') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'benny-ledger-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let token;
  const call = (command, input = {}, succeeds = true) => {
    // Each call is a completely new process; no module globals can preserve state.
    const result = spawnSync(process.execPath, [script, dir, command], { input: JSON.stringify({ token, ...input }), encoding: 'utf8' });
    assert.equal(result.status, succeeds ? 0 : 1, result.stderr || result.stdout);
    return succeeds ? JSON.parse(result.stdout) : result.stderr;
  };
  token = call('acquire', { run_id: 'fixture-first-run' }).token;
  call('init', { workflow, channel: 'C123', start_after_ts: '1700000000.000000' });
  return { dir, call, reacquire() { call('release'); token = call('acquire', { run_id: 'fixture-restarted-run' }).token; } };
}
const ts = '1700000001.000001';
const root = { ts, user: 'U123' };
const page = (f, messages = [root], cursor = null, next_cursor = null) => f.call('page', { channel: 'C123', cursor, next_cursor, messages });

test('exact Slack timestamps, duplicate discovery and pagination survive process restart', t => {
  const f = fixture(t);
  page(f, [root, { ts: '1700000002.999999', user: 'U123' }, { ts: '1700000001.000002', thread_ts: ts, user: 'U123' }, { ts: '1700000001.000003', user: 'UBOT', bot_id: 'B1' }], null, 'page-2');
  f.reacquire();
  let state = f.call('show');
  assert.equal(state.discovery.cursor, 'page-2');
  assert.equal(state.discovery.after_ts, '1700000000.000000');
  assert.equal(Object.keys(state.reports).length, 2);
  assert.match(f.call('page', { channel: 'C123', cursor: null, next_cursor: null, messages: [] }, false), /cursor/);
  page(f, [root], 'page-2');
  f.reacquire();
  state = f.call('show');
  assert.equal(state.discovery.after_ts, '1700000002.999999');
  assert.equal(f.call('pending').length, 2);
  assert.equal(state.reports[ts].thread_ts, ts);
  assert.match(f.call('page', { channel: 'C123', cursor: null, next_cursor: null, messages: [{ ts: Number(ts), user: 'U123' }] }, false), /exact string/);
});

test('overlapping automation cannot obtain a held lock or impersonate its owner', t => {
  const f = fixture(t);
  assert.match(f.call('acquire', { run_id: 'overlap' }, false), /LOCKED/);
  assert.match(f.call('show', { token: 'wrong' }, false), /owner token/);
  f.reacquire();
  assert.equal(f.call('show').version, 1);
});

test('delayed verdict remains pending and rejection gate cannot be bypassed early', t => {
  const f = fixture(t);
  page(f);
  f.call('checkpoint', { ts, stage: 'waiting_verdict', details: { deadline: '2099-01-01T00:00:00Z' } });
  f.reacquire();
  assert.equal(f.call('pending')[0].stage, 'waiting_verdict');
  assert.match(f.call('checkpoint', { ts, stage: 'ready' }, false), /trusted verdict/);
  f.call('checkpoint', { ts, stage: 'ready', details: { verdict_ts: '1700000009.000001', evidence: 'Fixture trusted identity and marker read from original thread' } });
  f.call('checkpoint', { ts, stage: 'waiting_rejection', details: { rejection_deadline: '2099-01-01T00:00:00Z' } });
  assert.match(f.call('checkpoint', { ts, stage: 'ready_to_fix', details: { evidence: 'Fresh fixture ownership check' } }, false), /deadline/);
  assert.match(f.call('checkpoint', { ts, stage: 'waiting_rejection', details: { rejection_deadline: '2000-01-01T00:00:00Z' } }, false), /immutable/);
  f.call('checkpoint', { ts, stage: 'complete' });
  assert.equal(f.call('pending').length, 0);
});

test('elapsed rejection gate accepts evidence and continues after restart', t => {
  const f = fixture(t, 'repro');
  page(f);
  f.call('checkpoint', { ts, stage: 'ready', details: { verdict_ts: '1700000009.000001', evidence: 'Fixture trusted verdict' } });
  f.call('checkpoint', { ts, stage: 'waiting_rejection', details: { rejection_deadline: '2000-01-01T00:00:00Z' } });
  f.reacquire();
  assert.match(f.call('checkpoint', { ts, stage: 'ready_to_fix' }, false), /evidence/);
  f.call('checkpoint', { ts, stage: 'ready_to_fix', details: { evidence: 'Fresh fixture ownership/rejection check' } });
  assert.equal(f.call('pending')[0].stage, 'ready_to_fix');
});

test('crash after prepare fails closed on restart; read-back can verify without repeating', t => {
  const f = fixture(t, 'triage');
  page(f);
  f.call('prepare', { ts, action_id: 'tracker-create', intent: 'Create fixture issue for source permalink' });
  // The process which prepared has exited, simulating a crash before result commit.
  f.reacquire();
  assert.equal(f.call('show').reports[ts].actions['tracker-create'].status, 'prepared');
  assert.match(f.call('prepare', { ts, action_id: 'tracker-create', intent: 'Duplicate!' }, false), /never repeat/);
  assert.match(f.call('prepare', { ts, action_id: 'another-id', intent: 'Bypass unresolved write' }, false), /Unresolved/);
  assert.match(f.call('checkpoint', { ts, stage: 'complete' }, false), /Reconcile/);
  f.call('resolve', { ts, action_id: 'tracker-create', status: 'verified', evidence: 'Fixture read-back found issue-123 with exact source permalink' });
  f.call('checkpoint', { ts, stage: 'complete', details: { tracker_url: 'https://example.test/issue-123' } });
  page(f);
  assert.equal(f.call('pending').length, 0);
});

test('prototype-like action IDs persist and cannot bypass reconciliation', t => {
  const f = fixture(t, 'triage');
  page(f);
  f.call('prepare', { ts, action_id: '__proto__', intent: 'Fixture external action' });
  f.reacquire();
  assert.equal(Object.hasOwn(f.call('show').reports[ts].actions, '__proto__'), true);
  assert.match(f.call('prepare', { ts, action_id: '__proto__', intent: 'Duplicate' }, false), /never repeat/);
  assert.match(f.call('checkpoint', { ts, stage: 'complete' }, false), /Reconcile/);
  f.call('resolve', { ts, action_id: '__proto__', status: 'verified', evidence: 'Fixture read-back found artifact' });
  assert.equal(f.call('show').reports[ts].actions.__proto__.status, 'verified');
});

test('ambiguous external response becomes blocked, not a retry or successful completion', t => {
  const f = fixture(t, 'triage');
  page(f);
  f.call('prepare', { ts, action_id: 'verdict-reply', intent: 'Reply to original thread' });
  f.call('resolve', { ts, action_id: 'verdict-reply', status: 'blocked', evidence: 'Fixture read-back unavailable; unknown whether write succeeded' });
  f.reacquire();
  const report = f.call('show').reports[ts];
  assert.equal(report.stage, 'blocked');
  assert.equal(report.actions['verdict-reply'].status, 'blocked');
  assert.match(f.call('checkpoint', { ts, stage: 'complete' }, false), /transition/);
  assert.equal(f.call('pending').length, 0);
});

test('invalid page is atomic and timestamps beyond float precision stay distinct', t => {
  const f = fixture(t);
  const before = fs.readFileSync(path.join(f.dir, 'ledger.json'), 'utf8');
  f.call('page', { channel: 'C123', cursor: null, next_cursor: null, messages: [root, { ts: 1 }] }, false);
  assert.equal(fs.readFileSync(path.join(f.dir, 'ledger.json'), 'utf8'), before);
  page(f, [{ ts: '9007199254740993.000001', user: 'U123' }, { ts: '9007199254740993.000002', user: 'U123' }]);
  assert.deepEqual(f.call('pending').map(r => r.ts), ['9007199254740993.000001', '9007199254740993.000002']);
  assert.equal(fs.readdirSync(f.dir).some(p => p.endsWith('.tmp')), false);
});
