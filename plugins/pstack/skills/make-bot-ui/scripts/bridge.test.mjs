import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBridge, runCodex } from './bridge.mjs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const cwd = fileURLToPath(new URL('.', import.meta.url));
async function fixture(t, options = {}) {
  const bridge = await startBridge({ cwd, ...options });
  t.after(() => bridge.close());
  const { token } = await (await fetch(bridge.origin + '/session')).json();
  const post = (input, headers = {}) => fetch(bridge.origin + '/run', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: bridge.origin, 'X-Pstack-Token': token, ...headers },
    body: typeof input === 'string' ? input : JSON.stringify(input) });
  return { ...bridge, post };
}
test('HTTP good request, dry-run and health; fixed cwd passed to runner', async t => {
  let calls = 0;
  const b = await fixture(t, { runner: async (input, config) => { calls++; assert.equal(config.cwd, cwd.slice(0, -1)); assert.equal(input.text, 'Hello'); return 'Summary'; } });
  assert.equal((await fetch(b.origin + '/health')).status, 200);
  assert.equal((await b.post({ operation: 'dry-run', text: 'Hello' })).status, 200);
  assert.equal(calls, 0);
  const res = await b.post({ operation: 'summarize', text: 'Hello' });
  assert.equal(res.status, 200); assert.equal((await res.json()).result, 'Summary'); assert.equal(calls, 1);
});
test('HTTP rejects auth, cross-origin, bad fields, JSON and oversized input', async t => {
  const b = await fixture(t, { runner: () => { throw new Error('must not run'); } });
  const good = { operation: 'summarize', text: 'hello' };
  assert.equal((await b.post(good, { 'X-Pstack-Token': 'wrong' })).status, 403);
  assert.equal((await b.post(good, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await b.post(good, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await b.post({ ...good, prompt: 'arbitrary' })).status, 400);
  assert.equal((await b.post({ ...good, text: 'x'.repeat(8001) })).status, 400);
  assert.equal((await b.post({ ...good, operation: 'exec' })).status, 400);
  assert.equal((await b.post('{bad')).status, 400);
  assert.equal((await b.post('x'.repeat(20000))).status, 413);
  assert.equal((await fetch(b.origin + '/session', { headers: { Origin: 'https://evil.test' } })).status, 403);
  const badHost = await new Promise(resolve => http.get(b.origin + '/health', { headers: { Host: 'evil.test' } }, r => { r.resume(); resolve(r.statusCode); }));
  assert.equal(badHost, 403);
});
test('HTTP serializes work, rate limits, and never retries failures', async t => {
  let release, calls = 0;
  const b = await fixture(t, { rateLimit: 2, runner: async () => { calls++; await new Promise(r => release = r); throw new Error('secret diagnostics'); } });
  const pending = b.post({ operation: 'summarize', text: 'hello' });
  while (!release) await new Promise(r => setTimeout(r, 5));
  assert.equal((await b.post({ operation: 'summarize', text: 'hello' })).status, 409);
  release(); const failed = await pending;
  assert.equal(failed.status, 502); assert.equal((await failed.text()).includes('secret'), false); assert.equal(calls, 1);
  assert.equal((await b.post({ operation: 'dry-run', text: 'hello' })).status, 200);
  assert.equal((await b.post({ operation: 'dry-run', text: 'hello' })).status, 429);
});
function fake(script) { return (input, config) => runCodex(input, { ...config, command: process.execPath, prefix: ['-e', script, '--'] }); }
test('HTTP uses subprocess with safe CLI args and fixed data prompt', async t => {
  const b = await fixture(t, { runner: fake('let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const a=process.argv; if(!a.includes("read-only")||!a.includes("--ephemeral")||a.includes("--ignore-user-config")||a.includes("--ignore-rules")||!s.includes("untrusted source data"))process.exit(3);console.log("adapter summary")})') });
  const r = await b.post({ operation: 'summarize', text: 'hello' });
  assert.equal(r.status, 200); assert.equal((await r.json()).result, 'adapter summary');
});
test('HTTP propagates child failure and kills child on timeout', async t => {
  const failed = await fixture(t, { runner: fake('process.stderr.write("secret");process.exit(7)') });
  assert.equal((await failed.post({ operation: 'summarize', text: 'hello' })).status, 502);
  const slow = await fixture(t, { timeoutMs: 100, runner: fake('setInterval(()=>{},1000)') });
  const at = Date.now();
  assert.equal((await slow.post({ operation: 'summarize', text: 'hello' })).status, 504);
  assert.ok(Date.now() - at < 3000);
});
