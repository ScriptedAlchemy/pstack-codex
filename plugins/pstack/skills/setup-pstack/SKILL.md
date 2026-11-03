---
name: setup-pstack
description: Configure the Codex models and reasoning efforts pstack uses for delegation roles. Use for setup-pstack, pstack model configuration, or changing pstack's budget.
---

Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.

# Setup pstack for Codex

Write `~/.codex/pstack-models.md`, the override file every delegating pstack skill reads before it spawns subagents. Missing roles keep the defaults below. This file is configuration for pstack, not a Codex model-provider configuration file.

## 1. Load current state

Read the existing override file when present, preserving its budget and configured role values. Otherwise start from the defaults in step 4. Drop retired roles absent from step 4 (for example `how critics`) and list each dropped line when showing the proposed configuration. Determine which Codex models the current host exposes from the current tool metadata or official local model picker. Never invent a model slug. `inherit-parent` and `auto` are always valid and both mean to omit the model override.

For roles executed through `spawn_agent`, its model and effort choices are authoritative. A picker entry or a model available through another harness does not establish that it can be spawned here. Follow `CODEX.md` when an explicit model requires a fresh context fork.

## 2. Choose a budget

Use the available user-input tool, or ask one concise question. Preserve the current budget on a rerun unless the user changes it. With no configuration, `large` matches the skill defaults. Offer:

- `unlimited — max reasoning`: each model's highest host-supported effort, up to `max`.
- `large — xhigh reasoning`: `xhigh`.
- `medium — high reasoning`: `high`.
- `small — medium reasoning`: `medium`.

Apply the selected effort to every real model, including panel entries. Preserve existing model choices, list order, and inheritance aliases; aliases keep both overrides unset. Model and effort are separate fields in Codex. Use the highest supported effort at or below the requested target. If none is available, mark the role as needing a choice. Never change the model to satisfy a budget.

## 3. Confirm role assignments

Show every role, model, and reasoning effort. Allow `inherit-parent` or `auto` for any role. Panel roles are ordered lists; one subagent runs per list entry. List length controls panel size. `arena cross-judge pool` is also a list, but Arena runs one judge: it tries only values from a model family other than the parent's, in list order, so order it by preference. An `inherit-parent` or `auto` value never judges. Keep a user's existing override unless it is unavailable.

If the user asks to repair unavailable assignments, choose replacements from the execution tool's available models using their advertised strengths and the role's purpose. Preserve valid assignments, the budget, and panel order and size; report each replacement. That request authorizes updating the file without another confirmation. Otherwise ask about unavailable choices before writing.

## 4. Write the override

Overwrite `~/.codex/pstack-models.md` atomically so reruns are idempotent. Use this shape:

```text
# pstack model configuration for Codex. Delete a role line to use its skill default.
# `inherit-parent` or `auto` omits explicit model and reasoning overrides.
# budget: large (xhigh)
feature, refactoring: gpt-6-luna @ xhigh
bug-fix: gpt-6-luna @ xhigh
perf-issue: gpt-6-luna @ xhigh
hillclimb: gpt-6-luna @ xhigh
judgment and prose: gpt-6-astra @ xhigh
hardest tasks: gpt-6-astra @ xhigh
how explorer: gpt-6.1-sol @ xhigh
how explainer: gpt-6-astra @ xhigh
why investigators: gpt-6.1-sol @ xhigh
why synthesizer: gpt-6-astra @ xhigh
reflect tooling: gpt-6.1-sol @ xhigh
reflect judgment, divergent, synthesizer: gpt-6-astra @ xhigh
arena runners: gpt-6-astra @ xhigh, gpt-6-luna @ xhigh
arena cross-judge pool: gpt-6-astra @ xhigh, gpt-6-luna @ xhigh
swarm workers: gpt-6-luna @ xhigh
architect runners: gpt-6-astra @ xhigh, gpt-6-luna @ xhigh
interrogate reviewers: gpt-6-astra @ xhigh, gpt-6-luna @ xhigh
```

Apply the budget to the separate effort values before writing. Validate every real model and its effort against the execution tool's available choices. Resolve unavailable assignments as described in step 3; do not write a slug the tool cannot accept.

## 5. Install or refresh custom agents

Locate this installed plugin's root. Copy `codex-agents/poteto-agent.toml` and `codex-agents/comment-sicko.toml` into `~/.codex/agents/`, replacing only those two pstack-owned files. Do not alter unrelated agents. Tell the user that new Codex sessions pick them up.

## 6. Confirm

Report the chosen budget, overrides, config path, and installed agent files. Re-running this skill updates the same files.

Optionally offer `$create-verification-skill` when the repository has no real-surface test harness. Also offer `$create-formal-verification-skill` once when the project has no formal verification skill: it checks a key property with a model checker, proof, or code-level verifier under explicit bounds. If the user declines either offer, move on.

If the user wants poteto-mode to persist across tasks in this repository, use the
optional [scoped AGENTS.md method](../../docs/standing-mode.md). Do not alter
project instructions unless that persistence was requested.
