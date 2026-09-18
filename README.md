# pstack for Codex

A Codex-native adaptation of [Lauren Tan's pstack](https://github.com/cursor/plugins/tree/main/pstack), preserving its workflows, playbooks, principles, and agent personas while adapting host-specific execution to Codex. This is an independent port, not an official Cursor or OpenAI plugin.

The plugin lives in `plugins/pstack`; `.agents/plugins/marketplace.json` makes this repository a native Codex marketplace. Read the [runtime contract](plugins/pstack/CODEX.md), [port coverage and runtime boundaries](PARITY.md), and [per-file source coverage](FILE-COVERAGE.md). Tool availability depends on the Codex host, permissions, and connected integrations. No credentials are bundled.

## Install

Requires a Codex build with `codex plugin` support, Git, and Python 3.11+ for validation.

If your shell defaults to an older Python, set `PSTACK_PYTHON` to the Python 3.11+
executable when running the installer (for example,
`PSTACK_PYTHON=/opt/homebrew/bin/python3.13 ./scripts/install.sh` on a matching
Homebrew installation).

```sh
git clone https://github.com/ScriptedAlchemy/pstack-codex.git
cd pstack-codex
./scripts/install.sh
```

The script validates the package, registers this checkout as the `pstack-codex` marketplace, and installs `pstack@pstack-codex`. It does not edit your Codex configuration by hand or overwrite personal agent definitions. Start a new Codex task after installation and invoke `$setup-pstack`. Most pstack skills are intentionally explicit-only; invoke them with `$<skill-name>`, such as `$interrogate`. Ask to use `$poteto-mode` as a standing instruction for the current task when you want the orchestration workflow. Repository-local skills belong under `.agents/skills`, not `.codex/skills`.

Alternatively, install the published marketplace without cloning:

```sh
codex plugin marketplace add ScriptedAlchemy/pstack-codex
codex plugin add pstack@pstack-codex
```

Optional named custom agents are provided in `plugins/pstack/codex-agents`. Review these before copying them into `~/.codex/agents`; the workflows also support generic workers loaded with the corresponding persona instructions, so copying agents is not required. Run `setup-pstack` to configure model preferences and connected integrations. Hooks, MCPs, and external automation services are not automatically invented or enabled: consult the runtime contract and workflow setup instructions for the actual supported equivalents.

## Verify and develop

```sh
./scripts/validate.sh
```

The portable validator checks the marketplace, manifest, all skill entry points, invocation policies, relative runtime links, agent TOML, and every file in the pinned upstream inventory. Run `python3 scripts/parity.py --report` for a per-file retained/adapted/replaced report. Runtime-dependent integrations still need an authenticated end-to-end test in the target host; structural checks do not prove external-service delivery.

The [integration test report](INTEGRATION-TESTS.md) separates live host/service
proof from fixture coverage. Run `bash scripts/test.sh` for the combined suite
after installing the Bun helper dependencies below. The bot UI ships a tested
loopback HTTP-to-Codex bridge, and Benny ships a tested durable polling ledger;
neither starts automatically on installation.

Helper-script tests require Bun:

```sh
cd plugins/pstack/skills/poteto-mode/scripts
bun install --frozen-lockfile
bun test orch watch-pr
bun run typecheck
node --test check-plan.test.mjs worktree-audit.test.mjs
```

Before reinstalling a modified local plugin, use Codex's `plugin-creator` skill cachebuster/reinstall flow; then run `./scripts/install.sh` and start a new task. Keep the published version updated when shipping changes so existing installations do not reuse stale caches.

Move test-only `node_modules` outside the plugin directory before installation;
the installer refuses to package it. Keep your dependency copy for subsequent
test runs rather than committing or distributing it.

## Track upstream safely

The source snapshot is pinned in [UPSTREAM.json](UPSTREAM.json). This repository uses its own native layout and history; **do not merge the entire Cursor plugins monorepo into this repository**.

```sh
git remote add upstream https://github.com/cursor/plugins.git # once, if absent
./scripts/check-upstream.sh
```

The audit fetches upstream Git objects and prints pstack-only changes since the pinned source. It never replaces translated files or advances the pin. See [UPDATING.md](UPDATING.md) for the review-and-port procedure. `origin` is this port; `upstream` remains the original repository.

## License and attribution

MIT. Original pstack copyright © 2026 Lauren Tan; original license is retained in [LICENSE](LICENSE) and the plugin. Codex adaptation changes are distributed under the same license. Upstream version: 0.15.2, source commit `e31650eea443aaea1e84cc15d88c13f40080b275`.
