# Durable ledger CLI

Requires Node.js 22 or newer. All commands read one JSON object from stdin and emit JSON to stdout. A nonzero exit means stop; do not proceed with an external action. Run `node /absolute/path/to/benny/scripts/ledger.mjs /absolute/private/state/triage COMMAND`. Repro uses a different state directory. The state directory must be durable, outside Git/disposable worktrees, and on a local filesystem supporting atomic rename and exclusive file creation. It stores report coordinates and evidence, not integration credentials.

## Run lifecycle

1. `acquire` with `{"run_id":"actual Codex automation run ID"}` returns an owner `token`. Save it in this run's context, not source code. Every subsequent command needs `"token":"<returned token>"`. A held lock fails; finish without acting. The lock spans the entire scheduled run, not one command.
2. `init` with token, `channel`, exact-string `start_after_ts`, and `workflow` (`triage` or `repro`). Initialization is idempotent only for identical configuration.
3. `show` returns current state. Start history reads after `discovery.after_ts` with the saved `discovery.cursor`. Allow an overlap on a fresh pagination cycle; the ledger deduplicates roots. Feed each observed page to `page` with token, `channel`, `cursor` (current cursor or null), `next_cursor` (API continuation or null at the end), and `messages` (raw history message records). Do not synthesize pages from an incomplete tool response. The command saves the page's reports and next cursor atomically. A partial pagination cycle does not advance `after_ts`. If a provider cursor expires, pause for recovery; never skip to the newest page. Human roots have `user`, no `bot_id`/`subtype`, and absent or equal `thread_ts`; resolve unusual human message subtypes deliberately before adapting the filter.
4. `pending` with token and optional `limit` (default 10) returns oldest pending reports. It never removes reports when discovery advances. Preserve `source_channel_id`, `ts`, and `thread_ts` exactly when calling the operational workflow. Review blocked reports in `show` separately and notify only when newly actionable.
5. Use `checkpoint`, `prepare`, and `resolve` as below. Release with `release` plus token in a finally-style cleanup after all tool work stops. This releases the lock but preserves the ledger.

Every invocation is a fresh process; no resident daemon is required. A crash can leave `run.lock/owner.json` and, if killed during a state command, `run.lock/transaction.lock`. Do not reclaim either by age. Inspect the recorded run and confirm it and all its workers are stopped. Only then may its owner token be recovered for `release`. An interrupted transaction additionally requires inspecting the atomic ledger and removing just that stale transaction lock after confirming no command is alive. Corrupt/unknown state fails closed. There is intentionally no unattended force-unlock command.

## Checkpoints

`checkpoint` takes token, exact `ts`, `stage`, and optional `details`. Supported detail strings: `deadline`, `rejection_deadline`, `tracker_url`, `verdict_ts`, `operations_channel`, `operations_ts`, `branch`, `pr_url`, `evidence`. Deadlines are parseable date-time strings; Slack timestamps must remain six-decimal strings. Coordinates cannot be changed through a checkpoint.

Triage begins `ready`; repro begins `waiting_verdict`. Available progressions:

- `waiting_verdict` → `ready`, `expired`, or `blocked`. Repro's transition to ready requires a verified `verdict_ts` and read-back `evidence`.
- `ready` → `waiting_followup`, `waiting_rejection`, `complete`, or `blocked`.
- `waiting_followup` → `ready`, `expired`, or `blocked`.
- `waiting_rejection` → `ready_to_fix`, `complete`, or `blocked`.
- `ready_to_fix` → `complete` or `blocked`.

The same stage can be checkpointed again. Terminal stages cannot resume automatically. Entering `waiting_rejection` requires a `rejection_deadline`, immutable thereafter. Entering `ready_to_fix` requires that deadline to have elapsed and fresh ownership/rejection read-back evidence. The agent must obey the operational workflow's other gates: this helper cannot authenticate a Slack author, validate the evidence's truth, or enforce UI reproduction proof.

## External actions

After authorization and source-thread reconciliation, call `prepare` with token, `ts`, a stable `action_id` (such as `tracker-create` or `triage-verdict`), and `intent` describing the exact destination and source permalink. Only a successful new prepare permits the one intended attempt. Then perform the actual action through the configured integration and read it back.

Call `resolve` with token, `ts`, the same `action_id`, `status` (`verified` or `blocked`), and `evidence` describing the observed artifact/coordinates or ambiguity. A verified action cannot be prepared again. An unresolved prepared action prevents further writes and advancement. If a crash occurred after prepare, read back before any action; finding the artifact allows resolution without repeating it. An ambiguous result resolves blocked and blocks the report. If absence cannot be proven, do not retry. This conservative helper intentionally has no automatic retry/reset for a prepared or blocked external action; human-reviewed recovery is required when it cannot be reconciled.

This is not a distributed transaction or an exactly-once guarantee. The tests exercise real subprocesses and local state with fixtures, not live Slack/tracker/GitHub delivery. Run them with `node --test /absolute/path/to/benny/scripts/ledger.test.mjs`. A real authorized harmless report and configured integration tools are still required by the readiness checklist in `POLLING.md`.
