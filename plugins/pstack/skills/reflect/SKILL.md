---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
---

Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "$reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. Codex transcripts live under `~/.codex/sessions/YYYY/MM/DD/*.jsonl`. Read only files whose first `session_meta` record has `payload.cwd` equal to the current workspace; never sweep unrelated workspaces. Do not glob across `~/.codex/sessions/`. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
find ~/.codex/sessions -type f -name '*.jsonl' -print0 | xargs -0 ls -t | head -20
```

For each candidate, read the first JSONL line and require `type == "session_meta"` plus an exact `payload.cwd` match. Use `payload.session_id` to distinguish the current session from older candidates. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three `spawn_agent` calls using the `default` agent, explicit model and reasoning settings on each, and normal write-capable mode. Reviewers need MCP access for context lookups referenced in the transcript. Subagents inherit the parent's available MCP tools.

| Lens | `model` | Prompt template |
|---|---|---|
| Judgment | your configured reflect-judgment model (default `gpt-6-astra`) | `references/judgment-reviewer.md` |
| Tooling | your configured reflect-tooling model (default `gpt-5.6-sol`) | `references/tooling-reviewer.md` |
| Divergent | your configured reflect-judgment model (default `gpt-6-astra`) | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in their final response.

### 3. Synthesize

One `spawn_agent` call using the `default` agent and configured reflect-judgment model (default `gpt-6-astra @ high`) in normal write-capable mode. The synthesizer spot-verifies citations and may need inherited MCP tools. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to Codex's `skill-creator` skill skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but did not trigger when it should have): hand to `skill-creator` and run its description-optimization loop.
- `new skill via skill-creator: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
