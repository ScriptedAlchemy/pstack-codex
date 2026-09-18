#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"
"$repo_root/scripts/validate.sh"
node --test \
  plugins/pstack/skills/poteto-mode/scripts/check-plan.test.mjs \
  plugins/pstack/skills/poteto-mode/scripts/worktree-audit.test.mjs \
  plugins/pstack/skills/make-bot-ui/scripts/bridge.test.mjs \
  plugins/pstack/automations/benny/scripts/ledger.test.mjs \
  tests/runtime/runtime.test.mjs
if ! command -v bun >/dev/null; then
  echo 'Install Bun to run the retained orchestration and PR-watcher tests.' >&2
  exit 1
fi
cd "$repo_root/plugins/pstack/skills/poteto-mode/scripts"
if [[ ! -d node_modules ]]; then
  echo 'Run bun install --frozen-lockfile in plugins/pstack/skills/poteto-mode/scripts first.' >&2
  exit 1
fi
bun test orch watch-pr
bun run typecheck
