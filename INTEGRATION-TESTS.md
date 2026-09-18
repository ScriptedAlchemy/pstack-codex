# Integration verification

These results distinguish real host/service tests from local fixture coverage.
They do not certify arbitrary production repositories or connected services.

## Observed on 2026-09-17 (America/Los_Angeles)

| Area | Evidence | Result / remaining boundary |
|---|---|---|
| Installed plugin | Installed cache compared with source; fresh Codex session loaded an installed skill | Passed; restart/start a new task after reinstall |
| GitHub PR watcher | Read-only `--status-only` query against `cursor/plugins#389` retrieved head, reviews and live CI | Passed; no comment, mutation or merge performed |
| Native scheduler configuration | Created a paused current-task heartbeat, viewed it, then deleted it; deletion acknowledged | Passed for configuration lifecycle only; not timed delivery |
| Bot UI | In-app Browser filled the actual local form and submitted a dry run; response reported 51 characters | Passed without external writes |
| Bot execution | Local HTTP bridge launched authenticated `codex exec`, returned HTTP 200 and a summary of a harmless tree-planting fixture | Passed; server stopped afterward |
| Bridge failure controls | Real HTTP requests and controlled subprocess fixtures | Schema, body bounds, origin/host/authentication, rate/concurrency, child failure and timeout checks |
| Benny polling ledger | Separate CLI processes and fixture messages | Durable state, locking, duplicate handling, paging, delayed verdicts and ambiguous-action handling; not live Slack |
| Personas and standing instructions | Fresh Codex CLI session with installed persona and temporary scoped `AGENTS.md` | Read-only review found fixture comment and selected Investigation; source fixture unchanged |
| Worker isolation | Temporary Git repository and worker worktree | Worker commit and files stayed off parent branch |
| Native read-only sandbox | Actual native sandbox attempted `touch` in a temporary fixture; OS returned `Operation not permitted`, exit 1, and no file was created | Passed on the tested macOS host; not a guarantee for full-access child configurations |

No test contacted Grokbot. No production Slack message, tracker issue, PR merge,
or persistent test server was created. The paused scheduler fixture was removed.

## Repeatable tests

Install Bun and Python 3.11+, install the helper dependencies with
`bun install --frozen-lockfile` in `plugins/pstack/skills/poteto-mode/scripts`, then
run `bash scripts/test.sh`. `PSTACK_PYTHON` can select a non-default Python.
The combined suite passed 73 local/fixture checks. Two additional opt-in host
checks (live persona/scoped instructions and native sandbox enforcement) passed
separately. Tests under `tests/runtime` document the opt-in live Codex test; it consumes
account usage and does not run as part of an ordinary fixture-only pass.

Do not package `node_modules` into a plugin release or commit runtime state.
The bridge and Benny ledger themselves use only Node built-ins.

## Still gated on the target environment

- **Slack/Linear end-to-end:** directory discovery found both integrations
  available but unconnected. Connect them and select a harmless test channel and
  tracker project before creating test messages/issues. Follow Benny's readiness
  test, including duplicate/interrupt recovery and read-back after writes.
- **Timed scheduler delivery:** a saved paused automation is not proof of a
  wakeup. Test one harmless scheduled run on the intended host, inspect its
  observed output, then remove the fixture. Verify the host can access the
  required integrations unattended. CLI-only runs must not pretend desktop
  scheduling tools are available.
- **PR mutation and application reproduction:** fixture/unit coverage and
  read-only GitHub queries do not test a merge, a production fix, or an arbitrary
  app UI. Use an explicitly selected disposable target before enabling these.
- **Cloud execution:** explicit worktrees are the local isolation equivalent,
  not provisioned cloud machines. Unattended lifetime depends on the selected
  Codex host/scheduler and its permissions.

See [PARITY.md](PARITY.md) for the native method used for each upstream feature.
