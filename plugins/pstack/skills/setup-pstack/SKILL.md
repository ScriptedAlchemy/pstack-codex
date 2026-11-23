---
name: setup-pstack
description: Configure the Codex models and reasoning efforts pstack uses for delegation roles. Use for setup-pstack, pstack model configuration, or changing pstack's budget.
---

Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.

# Setup pstack for Codex

Write `~/.codex/pstack-models.md`, the override file every delegating pstack skill reads before it spawns subagents. Missing roles keep the defaults below. This file is configuration for pstack, not a Codex model-provider configuration file.

## 1. Load current state

Read the existing override file when present, preserving its budget and configured role values. Otherwise start from the defaults in step 4. A line whose role is not in step 4, such as `how critics`, `hardest tasks`, `architect runners`, `reflect tooling`, `reflect judgment, divergent, synthesizer`, `why investigators`, `why synthesizer`, `how explorer`, or `how explainer`, is from a retired role. Drop it and list each dropped line when showing the proposed configuration. Determine which Codex models the current host exposes from the current tool metadata or official local model picker. Never invent a model slug. `inherit-parent` and `auto` are always valid and both mean to omit the model override.

A file without the `# defaults: 3` line comes from an older setup. That setup wrote a line for every role, so some of its values are old defaults, not choices. Before step 2, replace these values:

- An `unlimited` budget line becomes `large`, because no role runs above `xhigh`. Any `max` or `ultra` effort on a real model becomes `xhigh`.
- A `gpt-6-luna` value in `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, or `swarm workers` is the old fast-code default and takes the role's step 4 default.
- In a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`), a list of exactly one `gpt-6-astra` entry and one `gpt-6-luna` entry, in either order, is the old two-seat default and takes the role's step 4 list.

Every other value is the user's choice and stays, including every `inherit-parent` or `auto` value. Tell the user which values you replaced. Upstream's Gemini seat migration has no Codex equivalent: Codex exposes no Gemini model, so there is no Gemini entry to rewrite.

For roles executed through `spawn_agent`, its model and effort choices are authoritative. A picker entry or a model available through another harness does not establish that it can be spawned here. Follow `CODEX.md` when an explicit model requires a fresh context fork.

## 2. Choose a budget

Use the available user-input tool, or ask one concise question. Preserve the current budget on a rerun unless the user changes it. With no configuration, `large` matches the skill defaults. Offer these three options:

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

Each role has a target effort: its default's effort moved by the budget. `large` keeps it, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `xhigh` > `high` > `medium` > `low`. No role runs above `xhigh`, and a target at the bottom of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land; panel seats and `swarm workers` default to `high`, so `medium` writes `medium` and `small` writes `low` for them. Apply the role's target to every real model in the role, panel entries included. Preserve existing model choices, list order, and inheritance aliases; aliases keep both overrides unset. Model and effort are separate fields in Codex. Use the highest supported effort at or below the target. If none is available, mark the role as needing a choice. Never change the model to satisfy a budget.

## 3. Confirm role assignments

Show every role, model, and reasoning effort. Offer the detected models at `xhigh` or below, and allow `inherit-parent` or `auto` for any role. Panel roles are ordered lists; one subagent runs per list entry. List length controls panel size. `arena cross-judge pool` is also a list, but Arena runs one judge: it tries only values from a model family other than the parent's, in list order, so order it by preference. Families are the ones Phase A of the **arena** skill defines. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm. Keep a user's existing override unless it is unavailable.

If the user asks to repair unavailable assignments, choose replacements from the execution tool's available models using their advertised strengths and the role's purpose. Preserve valid assignments, the budget, and panel order and size; report each replacement. That request authorizes updating the file without another confirmation. Otherwise ask about unavailable choices before writing.

## 4. Write the override

Overwrite `~/.codex/pstack-models.md` atomically so reruns are idempotent. Use this shape:

```text
# pstack model configuration for Codex. Delete a role line to use its skill default.
# `inherit-parent` or `auto` omits explicit model and reasoning overrides. Alias entries in a panel list still count toward its fan-out.
# defaults: 3
# budget: large (xhigh)
feature, refactoring: gpt-6-astra @ xhigh
bug-fix: gpt-6-astra @ xhigh
perf-issue: gpt-6-astra @ xhigh
hillclimb: gpt-6-astra @ xhigh
judgment and prose: gpt-6-astra @ xhigh
arena runners: gpt-6-astra @ high, gpt-6.1-sol @ high, gpt-6-luna @ xhigh
arena cross-judge pool: gpt-6-astra @ high, gpt-6-luna @ xhigh
swarm workers: gpt-6-astra @ high
interrogate reviewers: gpt-6-astra @ high, gpt-6.1-sol @ high, gpt-6-luna @ xhigh
```

Always write the `# defaults: 3` line and a `# budget` line with the chosen label and the effort that label names. Apply the budget to the separate effort values before writing. Validate every real model and its effort against the execution tool's available choices; no effort may exceed `xhigh`. Resolve unavailable assignments as described in step 3; do not write a slug the tool cannot accept.

These defaults put code, prose, and judgment on the most capable model and give each panel three distinct model families. Codex variants do not provide upstream's cross-provider model diversity.

## 5. Install or refresh custom agents

Locate this installed plugin's root. Copy `codex-agents/poteto-agent.toml` and `codex-agents/comment-sicko.toml` into `~/.codex/agents/`, replacing only those two pstack-owned files. Do not alter unrelated agents. Tell the user that new Codex sessions pick them up.

## 6. Confirm

Report the chosen budget, overrides, config path, and installed agent files. Re-running this skill updates the same files.

Optionally offer `$create-verification-skill` when the repository has no real-surface test harness. Also offer `$create-formal-verification-skill` once when the project has no formal verification skill: it checks a key property with a model checker, proof, or code-level verifier under explicit bounds. If the user declines either offer, move on.

If the user wants poteto-mode to persist across tasks in this repository, use the
optional [scoped AGENTS.md method](../../docs/standing-mode.md). Do not alter
project instructions unless that persistence was requested.
