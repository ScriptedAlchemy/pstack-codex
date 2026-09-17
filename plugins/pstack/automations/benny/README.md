# benny

benny gives you two Codex automations for slack issue reports. one triages each report. the other reproduces confirmed bugs and may prepare a small draft fix.

the files in this directory are dormant setup and automation sources. they do not appear as slash skills.

## set it up

1. point Codex at [`FOR_AGENTS.md`](./FOR_AGENTS.md) and name the target repository.
2. let setup merge this whole directory into the target at `.codex/automations/benny/`. it must preserve destination-only files and review conflicts instead of overwriting local edits.
3. install and enable pstack through the supported Codex plugin CLI on the automation host. Do not write plugin JSON into `.codex/config.toml`.
4. keep user-owned configuration outside the copied pack, for example in `.codex/benny/`. adapt [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md).
5. commit `.codex/automations/benny/` and secret-free configuration before enabling either automation. Keep runtime state and secrets outside Git.
6. explicitly request two standalone project automations with your chosen cadence. Setup uses Codex's automation tool and initially saves paused schedules. Run the [polling adapter](./POLLING.md) and thread-safety tests on an authorized harmless report before enabling normal traffic.

Codex polls Slack instead of receiving Cursor event webhooks. It needs paginated Slack reads, thread replies, tracker tools, durable state, and an unattended-capable control adapter for repro. Polling adds latency; reconciliation cannot guarantee exactly-once delivery across ambiguous external failures. Installing pstack alone does not activate Benny or connect those services.
