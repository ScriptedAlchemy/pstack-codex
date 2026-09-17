# Port coverage and runtime boundaries

This is a workflow port, not an emulation of Cursor's runtime. All 158 files in
the pinned upstream snapshot have a retained, adapted, or explicitly replaced
counterpart. Run `python3 scripts/parity.py --report` for the per-file inventory.
File coverage alone does not prove behavioral equivalence.

| Upstream feature | Codex implementation | Boundary |
|---|---|---|
| 47 skills and 23 playbooks | Native skills, relative resources, shared `CODEX.md` runtime contract | Invocation uses `$skill-name`; routed explicit-only skills are read directly |
| Engineering principles | All 23 principle skills retained | Applied when the routing workflow calls for them |
| poteto-agent and Comment Sicko | Bundled persona instructions; optional custom-agent TOML | Named-agent registration is optional, not automatic plugin discovery |
| Role-based models and panels | Host-validated model/effort preferences; inheritance fallback | Model availability and concurrent capacity depend on the host; panels run in waves |
| Parallel workers | Explicit worktrees and bounded Codex subagents | No automatic cloud VM, branch isolation, or durable worker ID |
| Sticky mode/reminders | Standing task instruction, re-read on follow-ups and saved in resume notes | No automatic activation across unrelated tasks |
| Long-running goals and loops | Explicitly requested goals, supported heartbeat/project automations, durable ledgers | Requires scheduler availability; detached sleepers are not persistence |
| PR watching, orchestration, decision logs | Retained executable helpers with Codex paths and safety fixes | Authenticated GitHub and target repository permissions are required |
| Transcript recall/worktree audit | Workspace-matched Codex session metadata | Unrelated session content is not searched to infer ownership |
| Browser/UI verification | Available Codex browser/computer-use skills and project harnesses | Requires the relevant tool on the execution host |
| MCP evidence gathering | Discover and use connected apps/MCP tools | Upstream bundles no MCP server or lifecycle hook; none is fabricated |
| Benny | Complete setup, triage, reproduction/fix pack plus scheduled-polling adapter | Polling latency differs from webhook delivery; stays paused until configured and tested |
| make-bot-ui | Workflow for building UI against a supported endpoint or an explicitly requested local Codex bridge | Not a predeployed endpoint or unattended service |

## Verification scope

Structural validation, source-file coverage, helper tests, shell checks, and
installation checks are reproducible locally. Live Slack/tracker triage,
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
