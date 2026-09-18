#!/usr/bin/env node
// Local state only. Never calls Slack, a tracker, GitHub, or a scheduler.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const [directory, command] = process.argv.slice(2);
const fail = message => { throw new Error(message); };
const timestamp = value => typeof value === 'string' && /^\d+\.\d{6}$/.test(value);
const compare = (a, b) => {
  const [as, af] = a.split('.'), [bs, bf] = b.split('.');
  return BigInt(as) < BigInt(bs) ? -1 : BigInt(as) > BigInt(bs) ? 1 : af.localeCompare(bf);
};
function atomic(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temporary, file);
  const parent = fs.openSync(path.dirname(file), 'r');
  try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
}
function main(input) {
  if (!directory || !path.isAbsolute(directory)) fail('An absolute state directory is required');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, 'run.lock');
  const stateFile = path.join(directory, 'ledger.json');
  if (command === 'acquire') {
    if (typeof input.run_id !== 'string' || !input.run_id.trim()) fail('run_id required');
    try { fs.mkdirSync(lock, { mode: 0o700 }); }
    catch (error) { if (error.code === 'EEXIST') fail('LOCKED: inspect owning run; never auto-expire this lock'); throw error; }
    const owner = { token: randomUUID(), run_id: input.run_id, acquired_at: new Date().toISOString() };
    atomic(path.join(lock, 'owner.json'), owner);
    return owner;
  }
  const owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner.json'), 'utf8'));
  if (!input.token || input.token !== owner.token) fail('Lock owner token required');
  // Serialize even accidental parallel commands sharing an owner's token.
  let transaction = path.join(lock, 'transaction.lock');
  let transactionFd;
  try { transactionFd = fs.openSync(transaction, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') fail('TRANSACTION LOCKED: inspect interrupted command before recovery'); throw error; }
  let retired;
  try {
    // Recheck after acquiring the transaction: release/reacquire may have replaced
    // the directory since the initial owner read.
    if (JSON.parse(fs.readFileSync(path.join(lock, 'owner.json'), 'utf8')).token !== input.token) fail('Lock ownership changed');
    if (command === 'release') {
      retired = path.join(directory, `released-${randomUUID()}`);
      fs.renameSync(lock, retired);
      transaction = path.join(retired, 'transaction.lock');
      return { released: true };
    }
    let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
    if (command === 'init') {
      if (!timestamp(input.start_after_ts) || typeof input.channel !== 'string' || !input.channel.trim()) fail('channel and exact start_after_ts string required');
      if (!['triage', 'repro'].includes(input.workflow)) fail('workflow must be triage or repro');
      if (state) {
        if (state.channel !== input.channel || state.start_after_ts !== input.start_after_ts || state.workflow !== input.workflow) fail('Existing configuration is immutable');
        return state;
      }
      state = { version: 1, channel: input.channel, workflow: input.workflow, start_after_ts: input.start_after_ts, discovery: { after_ts: input.start_after_ts, cursor: null, newest_ts: input.start_after_ts }, reports: {} };
    } else if (!state || state.version !== 1) fail('Initialize a version-1 ledger first');
    if (command === 'show') return state;
    if (command === 'pending') {
      const limit = input.limit ?? 10;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) fail('limit must be 1..1000');
      return Object.values(state.reports).filter(r => !['complete', 'expired', 'blocked'].includes(r.stage)).sort((a, b) => compare(a.ts, b.ts)).slice(0, limit);
    }
    if (command === 'page') {
      if (input.channel !== state.channel || (input.cursor ?? null) !== state.discovery.cursor) fail('Wrong channel or pagination cursor');
      if (!Array.isArray(input.messages) || !(input.next_cursor === null || typeof input.next_cursor === 'string' && input.next_cursor.length)) fail('messages and next_cursor (string or null) required');
      if (input.next_cursor !== null && input.next_cursor === state.discovery.cursor) fail('Pagination must advance');
      for (const message of input.messages) {
        if (!timestamp(message.ts)) fail('Slack ts must be an exact string');
        if (message.thread_ts && message.thread_ts !== message.ts || message.bot_id || message.subtype || !message.user) continue;
        if (compare(message.ts, state.start_after_ts) <= 0) continue;
        if (!Object.hasOwn(state.reports, message.ts)) state.reports[message.ts] = { source_channel_id: state.channel, ts: message.ts, thread_ts: message.ts, stage: state.workflow === 'repro' ? 'waiting_verdict' : 'ready', first_seen_at: new Date().toISOString(), actions: {} };
        if (compare(message.ts, state.discovery.newest_ts) > 0) state.discovery.newest_ts = message.ts;
      }
      state.discovery.cursor = input.next_cursor;
      if (input.next_cursor === null) state.discovery.after_ts = state.discovery.newest_ts;
    } else if (['checkpoint', 'prepare', 'resolve'].includes(command)) {
      if (!timestamp(input.ts) || !Object.hasOwn(state.reports, input.ts)) fail('Known exact report ts required');
      const report = state.reports[input.ts];
      if (command === 'checkpoint') {
        const transitions = {
          waiting_verdict: ['waiting_verdict', 'ready', 'expired', 'blocked'],
          ready: ['ready', 'waiting_followup', 'waiting_rejection', 'complete', 'blocked'],
          waiting_followup: ['waiting_followup', 'ready', 'expired', 'blocked'],
          waiting_rejection: ['waiting_rejection', 'ready_to_fix', 'complete', 'blocked'],
          ready_to_fix: ['ready_to_fix', 'complete', 'blocked'], complete: ['complete'], expired: ['expired'], blocked: ['blocked'],
        };
        if (!transitions[report.stage]?.includes(input.stage)) fail('Invalid stage transition');
        if (Object.values(report.actions).some(a => a.status !== 'verified') && input.stage !== 'blocked') fail('Reconcile unresolved external action before advancing');
        const details = input.details ?? {};
        const allowed = ['deadline', 'rejection_deadline', 'tracker_url', 'verdict_ts', 'operations_channel', 'operations_ts', 'branch', 'pr_url', 'evidence'];
        if (!details || typeof details !== 'object' || Array.isArray(details)) fail('details must be an object');
        for (const [key, value] of Object.entries(details)) {
          if (!allowed.includes(key) || typeof value !== 'string' || !value) fail('Unsupported checkpoint detail');
          if (key.endsWith('_ts') && !timestamp(value)) fail('Exact timestamp required');
          if (key.endsWith('deadline') && !Number.isFinite(Date.parse(value))) fail('ISO deadline required');
        }
        if (state.workflow === 'repro' && report.stage === 'waiting_verdict' && input.stage === 'ready' && (!timestamp(details.verdict_ts) || !details.evidence)) fail('Verified trusted verdict timestamp and evidence required');
        const rejection = details.rejection_deadline ?? report.rejection_deadline;
        if (report.rejection_deadline && details.rejection_deadline && report.rejection_deadline !== details.rejection_deadline) fail('Rejection deadline is immutable once set');
        if (input.stage === 'waiting_rejection' && !rejection) fail('Rejection deadline required');
        if (input.stage === 'ready_to_fix' && (!rejection || Date.now() < Date.parse(rejection) || !details.evidence)) fail('Rejection deadline and fresh ownership/rejection evidence required');
        Object.assign(report, details, { stage: input.stage, updated_at: new Date().toISOString() });
      } else {
        if (typeof input.action_id !== 'string' || !/^[a-zA-Z0-9_.:-]{1,120}$/.test(input.action_id)) fail('Stable action_id required');
        if (command === 'prepare') {
          if (Object.hasOwn(report.actions, input.action_id)) fail('Action already recorded: read back and reconcile; never repeat blindly');
          if (['complete', 'expired', 'blocked'].includes(report.stage)) fail('Terminal report cannot mutate');
          if (Object.values(report.actions).some(a => a.status !== 'verified')) fail('Unresolved action must be reconciled first');
          if (typeof input.intent !== 'string' || !input.intent.trim()) fail('External action intent required');
          Object.defineProperty(report.actions, input.action_id, { enumerable: true, configurable: true, writable: true, value: { status: 'prepared', intent: input.intent, prepared_at: new Date().toISOString() } });
        } else {
          if (!Object.hasOwn(report.actions, input.action_id)) fail('Prepare action before resolving');
          const action = report.actions[input.action_id];
          if (action.status !== 'prepared') fail('Resolved action is immutable');
          if (!['verified', 'blocked'].includes(input.status) || typeof input.evidence !== 'string' || !input.evidence.trim()) fail('Verified or blocked result and read-back evidence required');
          Object.assign(action, { status: input.status, evidence: input.evidence, resolved_at: new Date().toISOString() });
          if (input.status === 'blocked') report.stage = 'blocked';
        }
      }
    } else if (command !== 'init' && command !== 'page') fail('Unknown command');
    atomic(stateFile, state);
    return state;
  } finally {
    fs.closeSync(transactionFd);
    fs.unlinkSync(transaction);
    if (retired) { fs.unlinkSync(path.join(retired, 'owner.json')); fs.rmdirSync(retired); }
  }
}
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  process.stdout.write(JSON.stringify(main(input)) + '\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`); process.exitCode = 1;
}
