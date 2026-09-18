# Codex polling adapter

Read this file before either operational workflow. Codex's supported scheduler does not supply Slack webhook payloads. Each scheduled run discovers reports using the configured Slack history/thread tools, then supplies one verified trigger to the unchanged per-report workflow. This introduces schedule-dependent latency; it is not an event-driven webhook service.

## Setup and state

Configure a user-approved cadence, an initial `start_after_ts`, a bounded `max_reports_per_run`, and an absolute `state_directory` outside Git and outside disposable worktrees. Triage and repro use separate state files in that directory. Never silently backfill channel history. The Slack integration must support paginated channel history and reading replies. Without these or durable state, remain paused.

Use one exclusive lock per automation (for example an atomic directory creation). If another run holds it, finish without acting. A stale lock requires checking the owning run before recovery; never assume a timeout proves it is dead. Release owned locks on exit. Do not rely on the scheduler to serialize runs.

Use the bundled [ledger helper](./scripts/ledger.mjs) for this local state protocol; see [its CLI instructions](./scripts/LEDGER.md). It implements exact string IDs, pending ledgers, atomic checkpoints, persisted pagination, an exclusive run lock, rejection-deadline gates, and prepared/verified/blocked external-action records. It does not call integrations or interpret reports. Each automation uses a separate state subdirectory and holds its owner token across the whole run, including tool calls. Invoke `prepare` before a permitted external mutation and `resolve` only after read-back; a surviving prepared record is a reconciliation requirement, never permission to retry. Check blocked records with `show`, since `pending` intentionally excludes them.

The state records each `(source_channel_id, root_ts)` independently: stage, first-seen time, deadlines, tracker URL, verified verdict timestamp, operations coordinates, branch/PR URL, and last verified external action. Save state atomically after verified transitions. A timestamp cursor is only a pagination aid, not proof a report was completed. Keep pending reports even after advancing the discovery cursor. Re-read overlapping history and deduplicate coordinates to tolerate interrupted runs.

## Every scheduled run

1. Load configuration and state, acquire the automation's lock, and validate the configured Slack channel. Start after the explicitly configured timestamp on the first run. Page through history without skipping unprocessed pages. Ignore thread replies as new reports.
2. Add unseen top-level human reports to the ledger. Preserve the root's exact string timestamp; never round a Slack timestamp through a floating-point number.
3. Resume pending reports first, then process at most the configured batch size. Build the operational trigger from the observed root: `{"source_channel_id":"<verified channel>","ts":"<exact root ts>","thread_ts":"<same root ts>"}`. These are runtime values, not unresolved prompt placeholders.
4. Before each external mutation, reconcile the source thread, tracker source permalink, existing operations thread and PR against saved state. On an ambiguous response, read back before retrying. If it cannot be determined whether a write succeeded, mark it blocked for human review instead of repeating it. Slack/tracker writes are not a transaction: this adapter cannot promise exactly-once delivery under every failure.
5. Triage invokes `skills/triage-issue-reports/SKILL.md` for each selected report. Existing trusted verdicts prevent duplicate verdicts. Repro independently retains pending roots until a trusted marker arrives or the configured deadline expires, then invokes `skills/reproduce-and-fix-issues/SKILL.md`. A missing marker on one poll is not a completed report.
6. Follow-up, verdict and rejection windows use durable deadlines. For waits longer than the current run can safely hold, checkpoint the stage and end; the next scheduled run re-reads the thread and resumes. Never open another scheduler, detached sleeper, or duplicate automation for a report. Repro cannot enter fix phase before its rejection deadline and a fresh ownership/rejection check.
7. Persist terminal outcomes and pending stages, release the lock, and finish. With no actionable change, stay quiet. Preserve the user's notification preference in the scheduler's supported notification field rather than inventing notification controls in the prompt.

## Readiness test

Before enabling normal traffic, run the adapter against an explicitly authorized harmless report. Test repeated discovery, interrupted state recovery, a delayed triage marker, an already-present verdict, overlapping-run lock contention, and an ambiguous write result. Verify no duplicate tracker issue or verdict, no source root post, and no skipped pending report. Keep both schedules paused until the integration and thread-safety checks pass. If the current host cannot run the necessary Slack/control tools unattended, report that limitation and do not claim Benny is live.
