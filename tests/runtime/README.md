# Runtime equivalent tests

The fixtures are disposable local Git repositories. No test modifies the user's
agent definitions, projects, automation schedules, or external services. Temporary
fixture directories are retained for inspection. The worktree test removes only
its clean, test-created worker worktree.

Run the deterministic source and worktree checks with Node 22 or newer and Git.

```sh
node --test tests/runtime/runtime.test.mjs
```

Run the real CLI checks with an authenticated Codex installation. These use model
tokens. `PSTACK_TEST_PLUGIN_ROOT` can point to an installed cache to test the actual
installed files instead of this checkout. It must be an absolute path.

```sh
PSTACK_LIVE_TEST=1 PSTACK_SANDBOX_TEST=1 \
  PSTACK_TEST_PLUGIN_ROOT=/absolute/path/to/installed/pstack \
  node --test tests/runtime/runtime.test.mjs
```

The live session requests no model override. It uses the user's current Codex
configuration. The test does not claim to measure the backend's resolved model.

## What each test proves

| Check | Evidence | Limit |
|---|---|---|
| Persona templates | Both omit model/effort overrides; reviewer requests read-only | Static configuration check, not an assertion that a named role was spawned |
| Writer isolation | A worker commits a fixture file in its worktree; the main branch still has no files | Git isolation, not a cloud VM or separate security boundary |
| Persona fallback | Real Codex reads the bundled Comment Sicko persona and identifies the exact narrating comment | A bounded review; does not exercise every possible review workflow |
| Poteto routing | Real Codex identifies Investigation for a read-only question | Router lookup, not execution of every playbook |
| Persistent instructions | Two independent Codex sessions load the same repository AGENTS.md marker | Project-scoped opt-in, not automatic activation in unrelated repositories |
| Read-only enforcement | Native `codex sandbox -P :read-only` runs `touch`; OS denies the write and no file appears | Explicit sandbox invocation on the tested host, not all child-agent permission configurations |

The read-only conformance test expects the current CLI's `codex sandbox -P`
interface. A CLI that uses a different sandbox interface must adapt that command;
do not interpret a command-line parsing error as successful enforcement.

## Observed host

Tested on macOS with `codex-cli 0.155.0-alpha.2.6` on 2026-09-17 and the installed
`pstack@pstack-codex` package version `0.15.2+codex.20260917234148`. Comment Sicko
flagged `// Add the two numbers.` and poteto-mode selected
`playbooks/investigation.md`. Both fixture files remained byte-for-byte unchanged.
The native sandbox returned exit status 1 and `Operation not permitted` for the
test write.

The CLI JSON stream on this host omitted shell-tool events. Therefore the sandbox
test uses the native sandbox command's exit status and stderr, not the model's
claim that it attempted or denied a write.

## Native scope and permission references

Repository AGENTS.md is the stronger, opt-in equivalent for keeping a mode across
new tasks in one project. Use the plugin's `docs/standing-mode.md` instructions.
Do not add a global AGENTS.md or install a hook as a side effect of testing.

[Codex project instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
loads scoped instructions at session startup. The
[custom-agent model rules](https://learn.chatgpt.com/docs/agent-configuration/subagents)
resolve omitted model/effort settings from spawn values, agent defaults, and the
parent. The same documentation warns that live parent permission overrides can
override a custom agent's sandbox defaults. See
[permission profiles](https://learn.chatgpt.com/docs/permissions) for the explicit
native read-only profile.
