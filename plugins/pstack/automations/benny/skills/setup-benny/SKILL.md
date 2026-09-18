---
name: setup-benny
description: Configure Benny and prepare its triage and repro automations. Use when installing Benny or changing its Slack, tracker, repository, routing, control, model, or budget settings.
---

# Set up Benny

Benny ships as a dormant automation pack inside pstack. The plugin manifest exposes only pstack's normal skill root; this file and the two operational files are not slash skills.

The human enters setup by pointing Codex at the pack's `FOR_AGENTS.md`. The bootstrap flow copies the whole pack into the target repository, then reads this file directly at `.codex/automations/benny/skills/setup-benny/SKILL.md`.

Benny needs external configuration and two live Codex automations.

Do not create or update an automation until the user explicitly asks. Never put a secret value in plugin files, prompts, or committed configuration.

## 1. Copy the pack and enable shared pstack skills

Do this before asking for Benny configuration and before preparing a live Codex automation.

Ask which repository will run the automations. The source pack is the directory containing `FOR_AGENTS.md`. The destination is `<target-repository>/.codex/automations/benny/`.

Merge the entire source pack into the destination:

1. Create the destination when it is absent.
2. Copy every source file to the same relative path.
3. Preserve destination-only files. Never delete unrelated files during install or refresh.
4. Keep user-owned configuration, feature maps, and routing maps outside the destination. Never overwrite them.
5. When an existing source-managed file differs, inspect the diff and merge without discarding local edits. If ownership is ambiguous, stop and ask before replacing it.
6. Verify that the destination contains `FOR_AGENTS.md`, this setup file, both operational files, their references, and the templates.

If this file is already being read from the target destination, treat the copy as complete and run the same verification before continuing.

Verify that a Codex marketplace exposes pstack and that `codex plugin list` reports it installed and enabled. Install it with `codex plugin add pstack@<marketplace-name>` when needed. Do not hand-edit Codex plugin state in `.codex/config.toml`.

Verify in a fresh session rooted in the target repository; ask the user to open one if needed. Verify that these shared pstack skills resolve:

- `how`
- `why`
- `tdd`
- `unslop`
- `principle-separate-before-serializing-shared-state`
- `principle-minimize-reader-load`
- `principle-guard-the-context-window`
- `principle-sequence-verifiable-units`
- `principle-fix-root-causes`
- `principle-prove-it-works`

Do not count a skill loaded only in the current session. The check must show that a fresh task receives the installed pstack plugin. If any dependency does not resolve, stop and explain the failure.

The Benny files are read directly from `.codex/automations/benny/`. Do not add that directory to a plugin manifest or expect its `SKILL.md` files to appear in the slash-skill list.

Tell the user that `.codex/automations/benny/` and any referenced secret-free configuration must be committed before either automation is enabled. Do not commit them unless the user asks.

Once this check passes, live automation prompts may read the committed operational files by their stable repository-relative paths. They must not embed a plugin cache path or copy the file contents.

## 2. Adapt the configuration

Open these copied examples:

- `../../templates/configuration.example.yaml`
- `../reproduce-and-fix-issues/references/feature-map.example.md`

Create user-owned copies outside `.codex/automations/benny/`. These are configuration files, not pack files. Example locations:

- Project config, such as `.codex/benny/configuration.yaml`
- Project feature map, such as `.codex/benny/feature-map.md`
- Project routing map, such as `.codex/benny/routing.md`
- User config, such as `~/.config/benny/configuration.yaml`
- User feature map, such as `~/.config/benny/feature-map.md`

Fill one feature-map section for every user-facing feature the automation may reproduce. Keep it at the user point of view. Do not freeze implementation details or current code paths in the map.

Do not edit the copied examples. Pack refreshes may update source-managed files after conflict review, but they must never touch the user-owned copies.

Prefer committed, secret-free files in the target repository when a fresh automation checkout must read them. Otherwise paraphrase the required values into the live prompt. Reference a repository file only after a read-only Git check confirms that the file is committed in the repository where the automation runs.

Use stable repository-relative paths for committed pack and configuration files. Never reference the plugin source directory or a plugin cache path from a live automation.

## 3. Fill the required choices

Ask for or confirm:

- Source Slack channel ID
- Optional operations or status channel ID
- Repository URL and default branch
- Triage identity or Slack user ID
- Issue tracker type, team, project, labels, and intake status
- Tracker adapter skill or MCP actions
- Optional routing map path
- Required control skill name
- Required user-facing feature-map path
- Status emoji strings
- Pull request URL format
- Polling and effort budgets
- Model slug for triage, repro, code work, and media review

Use only model slugs shown as available in the user's Codex host's available-model list. Do not guess a slug and do not carry over a private default.

The source channel, triage identity, repository, tracker adapter, control skill, and feature map must be explicit. Fail setup if any required value stays ambiguous.

Use pstack's `unslop` skill on the final automation names, descriptions, and prompt shims before saving them.

## 4. Check integration capabilities

The triage automation needs:

- Read access to the configured source Slack channel and its threads
- Thread-reply access in that channel
- Attachment metadata and file download access when reports include media
- Search, read, create, and update access through the configured issue-tracker adapter

The repro automation needs:

- Read access to the source thread
- Thread-reply access in the source channel
- Optional post and edit access in the configured operations channel
- Repository read and history access
- A pull request action that can open a draft pull request
- The configured control-adapter skill

Prefer configured Slack app or MCP tools for reads and posts. The optional `BENNY_SLACK_BOT_TOKEN` may fill a narrow gap such as editing one operations status message or downloading an attachment. Store the value in a secret manager or environment, not in YAML.

Do not use undocumented integration endpoints.

## 5. Prepare the routing map

If the user wants reroutes or owner pings:

1. Copy `../triage-issue-reports/references/routing.example.md` outside `.codex/automations/benny/`.
2. Replace every placeholder with public or organization-local values.
3. Keep owner pings off by default.
4. Allow a ping only for a configured feature owner or a confirmed likely regression author.

If no routing map is configured, triage may classify a report but must not guess a destination or owner.

## 6. Verify the control adapter

Read `../reproduce-and-fix-issues/references/control-adapter.md` and the user's completed feature map.

Confirm that the named skill can:

- Bring up the target app
- Navigate every mapped feature through the real UI
- Exercise mapped states through declared adapter actions
- Inspect state without forcing the result
- Capture screenshots
- Start and stop a recording
- Clean up its processes and temporary data

If any capability is missing, leave the repro automation disabled. It must fail closed rather than claim a reproduction it did not perform.

## 7. Prepare the live automations

Ask whether this is first-time creation or configuration of existing automations.

Read `../../FOR_AGENTS.md` from the copied pack as the primary user-intent source for either path. Use it to understand the two triggers, tools, instructions, outcomes, and shared rules.

### First-time creation

Codex local automations are scheduled, not Slack event webhooks. Preserve Benny's behavior with two project-scoped cron automations that poll the configured source channel for unseen top-level reports. Read `../../POLLING.md` and configure its durable ledger, locks, initial timestamp and batch size. Read `../../scripts/LEDGER.md`, verify Node.js 22 or newer on the scheduled host, and run `node --test .codex/automations/benny/scripts/ledger.test.mjs` from the repository. These local tests do not replace live integration readiness. Use the bundled helper with separate durable triage/repro state directories; confirm the scheduled task can execute it. A last-seen cursor alone cannot preserve pending reports. Create one automation at a time with the Codex automation tool after the user explicitly approves creation. Resolve the target project with the Codex project-listing tool first.

For each automation:

1. Read the matching copied prompt template as secondary internal source material.
2. Turn `FOR_AGENTS.md`, the finished Benny configuration, and the template intent into a complete natural-language request.
3. Tell the live prompt to read and follow its exact committed operational file under `.codex/automations/benny/`.
4. Use the stable repository-relative path, not a plugin source or cache path. Do not copy the operational file contents into the live prompt.
5. Confirm Slack and tracker tools are available to the scheduled task.
6. Confirm the copied pack and referenced configuration files are committed in the repository where the automation will run.
7. Save the automation paused with a user-approved cadence, target project id and host-supported model/effort. Instruct it to read `.codex/automations/benny/POLLING.md` first. Honor notification preferences through supported tool fields.
8. Verify the saved automation before starting the next one.

Give the Codex automation tool this complete triage intent, filled from configuration:

- Name `benny-triage`.
- Read and follow `.codex/automations/benny/skills/triage-issue-reports/SKILL.md` for every run.
- Poll for each unseen top-level report in the configured source Slack channel and reconcile state before writes.
- Read the triggering thread and reply only inside it.
- Use the configured issue-tracker integration.
- Classify, inspect evidence, trace cause, dedupe, and create only clear new bugs.
- End one thread-only verdict with the configured `[benny:bug]`, `[benny:performance]`, or `[benny:other]` marker and optional tracker URL.
- Never post a source-channel root message.

After the paused triage automation is verified, give the Codex automation tool this complete repro and fix intent:

- Name `benny-reproduce`.
- Read and follow `.codex/automations/benny/skills/reproduce-and-fix-issues/SKILL.md` for every run.
- Poll for the same unseen top-level reports in the configured source Slack channel and retain pending reports until triage completes or the deadline expires.
- Use the configured repository and default branch.
- Read the source thread and reply only inside it.
- Include pull request creation and the configured tracker, control-adapter, and feature-map requirements. Paraphrase mapped user paths and states unless a Git check confirms an eligible committed file in the same repository.
- Wait for a trusted triage marker before acting.
- Reproduce the exact symptom twice through the mapped real UI and capture evidence.
- Verify an existing fix without authoring over it.
- Attempt an optional bounded fix only after confirmed repro, then open a draft pull request when proof and checks pass.
- Never post a source-channel root message.

Do not duplicate Slack, repository, integration, completeness, authentication, approval, or schedule-validation work.

### Existing automations

Inspect existing Codex automation files under `$CODEX_HOME/automations/*/automation.toml`, identify the matching ids, and update the existing automations instead of creating duplicates.

Finish configuration, routing, control-adapter, and feature-map validation. Then give the user this concise editor checklist.

For the existing triage automation, update:

- Name and description
- Direct instruction to read `.codex/automations/benny/skills/triage-issue-reports/SKILL.md`
- Polling cadence, initial timestamp, durable state directory and source channel
- Slack thread read and reply capabilities
- Issue-tracker integration
- Paraphrased triage instructions, thread-only rule, and Benny verdict markers

For the existing repro automation, update:

- Name and description
- Direct instruction to read `.codex/automations/benny/skills/reproduce-and-fix-issues/SKILL.md`
- Matching polling configuration and source channel with independent repro state
- Repository and default branch
- Slack thread read and reply capabilities
- Pull request action
- Tracker, control-adapter, and feature-map requirements
- Paraphrased marker wait, evidence, verification, and bounded-fix instructions

Use the Codex automation tool to update each matching automation after resolving its id. Do not create replacements or duplicates.

### Creation boundary

Use only Codex's supported automation tool. Never call a private backend, fabricate raw automation directives, or use a browser URL that carries draft fields.

Do not enable either automation until the thread-safety test passes after saving both schedules paused.

## 8. Test thread safety

Use a test channel or a harmless test report.

Before testing, confirm that `.codex/automations/benny/` and every referenced secret-free configuration file are committed on the branch used by the automation. Confirm that both prompts point at their exact committed operational files. If any check fails, stop. Tell the user that the automation cannot be enabled yet.

Verify:

1. Triage stores the root `thread_ts` and posts exactly one verdict as a reply.
2. The verdict contains one configured marker.
3. Repro accepts the marker only from the configured triage identity.
4. Repro keeps the same immutable source coordinates.
5. No source-channel root message appears.
6. Worker isolation excludes Slack credentials and writes; otherwise perform the work in the coordinator without delegation.
7. Missing coordinates, a deleted parent, or a failed preflight produces no post and no tracker issue.

Also run recovery and deduplication tests in `../../POLLING.md`. Enable normal traffic only after all checks pass.
