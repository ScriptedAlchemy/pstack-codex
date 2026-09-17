---
name: setup-pstack
description: Configure the Codex models and reasoning efforts pstack uses for delegation roles. Use for setup-pstack, pstack model configuration, or changing pstack's budget.
---

Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.

# Setup pstack for Codex

Write `~/.codex/pstack-models.md`, the override file every delegating pstack skill reads before it spawns subagents. Missing roles keep the defaults below. This file is configuration for pstack, not a Codex model-provider configuration file.

## 1. Load current state

Read the existing override file when present. Otherwise start from the defaults in step 4. Determine which Codex models the current host exposes from the current tool metadata or official local model picker. Never invent a model slug. `inherit-parent` and `auto` are always valid and both mean to omit the model override.

## 2. Choose a budget

Use `request_user_input` when it is available. Otherwise ask one concise question. Offer:

- `unlimited` uses each role's listed effort.
- `large` caps explicit role efforts at `xhigh`.
- `medium` caps them at `high`.
- `small` caps them at `medium`.

Preserve the current choice on a rerun unless the user changes it. A model must support its selected effort. Fall back to the nearest supported effort at or below the requested cap.

## 3. Confirm role assignments

Show every role, model, and reasoning effort. Allow `inherit-parent` or `auto` for any role. Panel roles are ordered lists; one subagent runs per list entry. List length controls panel size. Keep a user's existing override unless it is unavailable.

## 4. Write the override

Overwrite `~/.codex/pstack-models.md` atomically so reruns are idempotent. Use this shape:

```text
# pstack model configuration for Codex. Delete a role line to use its skill default.
# `inherit-parent` or `auto` omits explicit model and reasoning overrides.
# budget: unlimited
feature, refactoring: gpt-5.6-luna @ medium
bug-fix: gpt-5.6-luna @ high
perf-issue: gpt-5.6-luna @ high
hillclimb: gpt-5.6-luna @ high
judgment and prose: gpt-6-astra @ high
hardest tasks: gpt-6-astra @ xhigh
how explorer: gpt-5.6-terra @ medium
how explainer: gpt-6-astra @ high
why investigators: gpt-5.6-terra @ medium
why synthesizer: gpt-6-astra @ high
reflect tooling: gpt-5.6-sol @ high
reflect judgment, divergent, synthesizer: gpt-6-astra @ high
arena runners: gpt-6-astra @ high, gpt-5.6-sol @ high, gpt-5.6-terra @ medium, gpt-5.6-luna @ medium
arena cross-judge pool: gpt-6-astra @ high, gpt-5.6-sol @ high, gpt-5.6-terra @ medium, gpt-5.6-luna @ medium
swarm workers: gpt-5.6-luna @ medium
architect runners: gpt-6-astra @ high, gpt-5.6-sol @ high, gpt-5.6-terra @ medium, gpt-5.6-luna @ medium
interrogate reviewers: gpt-6-astra @ high, gpt-5.6-sol @ high, gpt-5.6-terra @ medium, gpt-5.6-luna @ medium
```

Apply the budget cap to the effort tokens before writing. Validate every real model against the host's available-model list. Stop for a replacement choice if a requested slug is unavailable.

## 5. Install or refresh custom agents

Locate this installed plugin's root. Copy `codex-agents/poteto-agent.toml` and `codex-agents/comment-sicko.toml` into `~/.codex/agents/`, replacing only those two pstack-owned files. Do not alter unrelated agents. Tell the user that new Codex sessions pick them up.

## 6. Confirm

Report the chosen budget, overrides, config path, and installed agent files. Re-running this skill updates the same files.

Optionally offer to create a project-local verification skill when the repository has no real-surface test harness.
