# Port coverage and runtime boundaries

This is a workflow port, not an emulation of Cursor's runtime. All 200 files in
the pinned upstream snapshot have a retained, adapted, or explicitly replaced
counterpart. Run `python3 scripts/parity.py --report` for the per-file inventory.
File coverage alone does not prove behavioral equivalence.

| Upstream feature | Codex implementation | Boundary |
|---|---|---|
| 58 upstream skills, 2 Codex additions, and 23 playbooks | Native skills, relative resources, shared `CODEX.md` runtime contract | Invocation uses `$skill-name`; routed explicit-only skills are read directly |
| Engineering principles | All 24 principle skills retained | Applied when the routing workflow calls for them |
| poteto-agent and Comment Sicko | Bundled persona instructions; optional custom-agent TOML | Named-agent registration is optional, not automatic plugin discovery |
| Role-based models and panels | Host-validated model/effort preferences; inheritance fallback | Model availability and concurrent capacity depend on the host; panels run in waves |
| Parallel workers | Explicit worktrees and bounded Codex subagents | No automatic cloud VM, branch isolation, or durable worker ID |
| Sticky mode/reminders | Standing task instruction; optional scoped `AGENTS.md` for cross-task persistence | Opt-in per repository, not a Cursor UI-mode switch; see [method](plugins/pstack/docs/standing-mode.md) |
| Long-running goals and loops | Explicitly requested goals, supported heartbeat/project automations, durable ledgers | Requires scheduler availability; detached sleepers are not persistence |
| PR watching, orchestration, decision logs | Retained executable helpers with Codex paths and safety fixes | Authenticated GitHub and target repository permissions are required |
| Transcript recall/worktree audit | Workspace-matched Codex session metadata | Unrelated session content is not searched to infer ownership |
| Browser/UI verification | Available Codex browser/computer-use skills and project harnesses | Requires the relevant tool on the execution host |
| MCP evidence gathering | Discover and use connected apps/MCP tools | Upstream bundles no MCP server or lifecycle hook; none is fabricated |
| Benny | Complete setup, triage, reproduction/fix pack plus scheduled-polling adapter and executable durable ledger | State/recovery mechanics tested; live Slack/tracker still requires connection and readiness test |
| make-bot-ui | Workflow plus executable loopback UI/HTTP-to-Codex bridge | Live-tested fixed summarize/dry-run operations; adapt and review the fixed schema for other workflows; not a public webhook service |

## Verification scope

Structural validation, source-file coverage, helper tests, shell checks, and
installation checks are reproducible locally. See [integration test evidence](INTEGRATION-TESTS.md)
for actual browser, HTTP-to-Codex, persona, GitHub and scheduler-configuration tests.
Live Slack/tracker triage,
unattended scheduler delivery, real PR merging, and UI verification depend on
the user's target services and authorization. They are not enabled by installing
this plugin, and are not claimed as tested by a package preflight. Benny's
readiness checklist explicitly gates activation on a harmless authorized test
and recovery/duplicate checks.

## Official runtime references

- [Skill discovery, invocation and metadata](https://learn.chatgpt.com/docs/build-skills)
- [Subagents and inherited model settings](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Plugin packaging and local marketplace development](https://learn.chatgpt.com/docs/build-plugins)

The active host's tool schema is authoritative when an interface differs from
these documents. The plugin must report unavailable capabilities, not invent
equivalent-looking commands.

Codex additions: `automate-maintainer` restores the generator from [ScriptedAlchemy/plugins PR #1](https://github.com/ScriptedAlchemy/plugins/pull/1) and supports named groups. `automate-team` discovers active core contributors before invoking that workflow. These additions do not change the pinned upstream inventory.

The 0.15.17 port adds `$ketchup`, distills prompts and evidence frameworks, and uses two-entry default panels at `xhigh`. Codex defaults map judgment to `gpt-6-astra`, fast code to `gpt-6-luna`, and exploration/tooling to `gpt-6.1-sol`. Host validation and inheritance fallback still apply; configured panel lists and model overrides are preserved. These Codex variants do not provide upstream's cross-provider model diversity. The maintainer/team additions use concise entrypoints with linked scope, mining, synthesis, roster, and held-out evaluation procedures.

The 0.15.28 port adds `in-your-own-words`, `sharpen`, and the formal verification generator and maintenance skills. It brings upstream's PR review pagination, fenced-plan checks, forge-based stack discovery, and default-branch worktree audits. The audit still reads cached refs only and holds untracked or unpreserved work. Codex's native manifest replaces both upstream manifests, and `CODEX.md` replaces the Claude harness adapter; this repo does not package the separate generated Claude distribution. Effort tuning uses supported Codex fields without fabricating model slugs or speed controls. Custom maintainer/team skills and their resources remain unchanged.

The 0.15.29 port changes `$sharpen` to return a rewritten prompt without executing the task, and updates its guide and help entries. It preserves explicit-only Codex invocation and the runtime contract.

The 0.15.32 port adds `$statechart` (TLA+ models, Mermaid charts, and Pele PNG rendering) and `$ketchup-video` with explicit Codex invocation. Statechart runtime helpers are retained verbatim; its test fixtures canonicalize temporary paths for macOS and gate Linux-only preload tests by platform. The helpers need Node, TLC/Java (or mise), and npm for rendering; video generation requires available frame-rendering and encoding tools. Neither feature installs a host integration. Reflection edits go to repository or personal skills outside the plugin cache. PR stack discovery distinguishes fork heads and prefers active PRs, watcher sleeps respect deadlines, inline-code plan parsing matches delimiter lengths, and the worktree audit selects GNU/BSD timestamp flags while preserving Codex session scoping and cached-ref-only behavior. The swarm numbering was already contiguous in this port; its report wording is updated. The upstream Claude marketplace auto-update note does not apply to the Codex installer.

The 0.15.36 port replaces the statechart `.mjs` helpers with upstream's TypeScript compiler and its POSIX launcher (Node 22.18-22.x, Node 23.6+, Bun 1.1.5+, or Deno 2.0+), including the fast-check differential test corpus. Orchestrate is now agentic: the coordinator runs the program through `spawn_agent` and its own task list plus a durable store under `<repo>/.codex/pstack-runs/<run-name>/`; the `scripts/orch/` helpers and their test entry are removed. Codex has no PR or CI event subscription, so the playbook checks live state with `gh` instead of claiming parity; a saved heartbeat wake is the closest stand-in. Interrogate now keeps only findings proven by a rerun and drops the reviewer/rubric reference files. The arena cross-judge must come from a different model family when the host exposes one, and is skipped when none is available.
