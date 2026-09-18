import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const plugin = process.env.PSTACK_TEST_PLUGIN_ROOT || path.join(root, 'plugins/pstack');
const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

test('custom persona templates inherit model choices and reviewer has a read-only sandbox', () => {
  for (const name of ['poteto-agent', 'comment-sicko']) {
    const body = readFileSync(path.join(plugin, 'codex-agents', `${name}.toml`), 'utf8');
    assert.match(body, new RegExp(`name = "${name}"`));
    assert.match(body, /developer_instructions =/);
    assert.doesNotMatch(body, /^model(?:_reasoning_effort)?\s*=/m);
  }
  assert.match(readFileSync(path.join(plugin, 'codex-agents/comment-sicko.toml'), 'utf8'), /^sandbox_mode = "read-only"$/m);
});

test('worker worktrees isolate file and branch changes', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'pstack-isolation-'));
  run('git', ['init', '-q', '--initial-branch=main', temp]);
  run('git', ['-c', 'user.name=Pstack Test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture'], temp);
  const worktree = path.join(temp, 'worker');
  run('git', ['worktree', 'add', '-q', '-b', 'worker-test', worktree], temp);
  execFileSync('git', ['apply', '-'], { cwd: worktree, input: 'diff --git a/result.txt b/result.txt\nnew file mode 100644\n--- /dev/null\n+++ b/result.txt\n@@ -0,0 +1 @@\n+worker-only\n' });
  run('git', ['add', 'result.txt'], worktree);
  run('git', ['-c', 'user.name=Pstack Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'worker result'], worktree);
  assert.equal(run('git', ['branch', '--show-current'], temp), 'main');
  assert.equal(run('git', ['branch', '--show-current'], worktree), 'worker-test');
  assert.equal(run('git', ['ls-tree', '--name-only', 'HEAD'], temp), '');
  assert.equal(run('git', ['show', 'HEAD:result.txt'], worktree), 'worker-only');
  run('git', ['worktree', 'remove', worktree], temp);
});

test('optional live Codex session reads installed persona and scoped persistent instructions', { skip: process.env.PSTACK_LIVE_TEST !== '1', timeout: 240000 }, () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'pstack-live-persona-'));
  run('git', ['init', '-q', '--initial-branch=main', temp]);
  const instruction = `# Pstack runtime fixture\n\nFor this repository, read ${plugin}/CODEX.md on every new task. The persistent test marker is PSTACK_SCOPED_MODE_LOADED. Do not create or edit files.\n`;
  const sample = '// Add the two numbers.\nexport function add(a, b) { return a + b; }\n';
  for (const [filename, body] of [['AGENTS.md', instruction], ['sample.js', sample]]) {
    const lines = body.trimEnd().split('\n');
    execFileSync('git', ['apply', '-'], { cwd: temp, input: `diff --git a/${filename} b/${filename}\nnew file mode 100644\n--- /dev/null\n+++ b/${filename}\n@@ -0,0 +1,${lines.length} @@\n${lines.map(line => '+' + line).join('\n')}\n` });
  }
  const prompt = `This is a bounded integration test, not a software change. Do not use the network or edit any files. Read ${plugin}/agents/comment-sicko.md and use that persona to review only sample.js. Read ${plugin}/agents/poteto-agent.md and ${plugin}/skills/poteto-mode/SKILL.md as reference data (do not launch a full workflow). Report the marker from the repository's initial AGENTS.md instructions, the Comment Sicko deletion candidate, and which playbook poteto-mode uses for a read-only question. No subagents are needed.`;
  const result = execFileSync('codex', ['exec', '--ephemeral', '--json', '--color', 'never', '--sandbox', 'read-only', '-C', temp, prompt], { encoding: 'utf8', timeout: 220000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const events = result.split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.ok(events.some(event => event.type === 'turn.completed'), 'Codex completed the live turn');
  const response = events.filter(event => event.type === 'item.completed' && event.item?.type === 'agent_message').map(event => event.item.text).join('\n');
  assert.match(response, /PSTACK_SCOPED_MODE_LOADED/);
  assert.match(response, /Add the two numbers/);
  assert.match(response, /investigation/i);
  assert.equal(readFileSync(path.join(temp, 'sample.js'), 'utf8'), sample);
  assert.equal(readFileSync(path.join(temp, 'AGENTS.md'), 'utf8'), instruction);
  console.log(`Live evidence (${temp}): ${response}`);
  const freshSession = execFileSync('codex', ['exec', '--ephemeral', '--json', '--color', 'never', '--sandbox', 'read-only', '-C', temp, 'This is a second, independent read-only test session. State the persistent test marker supplied by the repository instructions. Do not edit files or use the network.'], { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const freshEvents = freshSession.split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.ok(freshEvents.some(event => event.type === 'turn.completed'));
  const freshResponse = freshEvents.filter(event => event.type === 'item.completed' && event.item?.type === 'agent_message').map(event => event.item.text).join('\n');
  assert.match(freshResponse, /PSTACK_SCOPED_MODE_LOADED/);
  assert.notEqual(freshEvents.find(event => event.type === 'thread.started')?.thread_id, events.find(event => event.type === 'thread.started')?.thread_id);
  assert.equal(readFileSync(path.join(temp, 'sample.js'), 'utf8'), sample);
  assert.equal(readFileSync(path.join(temp, 'AGENTS.md'), 'utf8'), instruction);
  console.log(`Independent-session persistence: ${freshResponse}`);
});

test('optional native read-only sandbox denies a harmless fixture write', { skip: process.env.PSTACK_SANDBOX_TEST !== '1' }, () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'pstack-live-sandbox-'));
  run('git', ['init', '-q', '--initial-branch=main', temp]);
  const target = path.join(temp, 'sandbox-probe.txt');
  const result = spawnSync('codex', ['sandbox', '-P', ':read-only', '-C', temp, 'touch', target], { encoding: 'utf8', timeout: 10000 });
  assert.equal(existsSync(target), false, 'sandbox probe must not be created');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /touch: .*sandbox-probe\.txt: (Operation not permitted|Permission denied|Read-only file system)/);
  console.log(`Sandbox evidence: ${result.stderr.trim()}`);
});
