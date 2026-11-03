#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"
"$repo_root/scripts/validate.sh"
node scripts/check-pstack-docs.mjs
node --test \
  tests/docs.test.mjs \
  plugins/pstack/skills/poteto-mode/scripts/check-plan.test.mjs \
  plugins/pstack/skills/poteto-mode/scripts/worktree-audit.test.mjs \
  plugins/pstack/skills/make-bot-ui/scripts/bridge.test.mjs \
  plugins/pstack/automations/benny/scripts/ledger.test.mjs \
  tests/runtime/log.test.mjs \
  tests/runtime/runtime.test.mjs
sc="$repo_root/plugins/pstack/skills/statechart/scripts"
sc_tmp=$(cd "$(mktemp -d)" && pwd -P)
if [[ -z "${TLA2TOOLS:-}" ]] && command -v mise >/dev/null; then
  tlc_dir=$(mise where 'http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4' 2>/dev/null || true)
  [[ -n "$tlc_dir" && -f "$tlc_dir/tla2tools.jar" ]] && export TLA2TOOLS="$tlc_dir/tla2tools.jar"
fi
if [[ -z "${JAVA:-}" ]]; then
  if command -v /usr/libexec/java_home >/dev/null && jhome=$(/usr/libexec/java_home 2>/dev/null); then
    export JAVA="$jhome/bin/java"
  elif command -v java >/dev/null; then
    export JAVA=java
  fi
fi
if [[ ! -d "$sc/node_modules" ]]; then
  if command -v bun >/dev/null; then
    (cd "$sc" && bun install)
  elif command -v npm >/dev/null; then
    (cd "$sc" && npm install --no-save)
  fi
fi
node_ver=$(node -p 'const [a,b,c]=process.versions.node.split(".").map(Number);a*1e6+b*1e3+c' 2>/dev/null || echo 0)
if { [[ "$node_ver" -ge 23006000 ]] || { [[ "$node_ver" -ge 22018000 ]] && [[ "$node_ver" -lt 23000000 ]]; }; } && [[ -d "$sc/node_modules" ]]; then
  (cd "$sc" && TMPDIR="$sc_tmp" node --disable-warning=ExperimentalWarning --test --test-concurrency=1 --test-timeout=90000 test/*.test.ts)
elif command -v bun >/dev/null && [[ -d "$sc/node_modules" ]]; then
  (cd "$sc" && bun test)
elif command -v deno >/dev/null && [[ -d "$sc/node_modules" ]]; then
  (cd "$sc" && deno test --quiet --no-prompt --allow-read --allow-write --allow-run --allow-env test/)
else
  echo "skip: statechart tests need Node 22.18-22.x, Node 23.6+, Bun 1.1.5+, or Deno 2.0+, plus installed devDependencies" >&2
fi
if ! command -v bun >/dev/null; then
  echo 'Install Bun to run the retained PR-watcher tests.' >&2
  exit 1
fi
cd "$repo_root/plugins/pstack/skills/poteto-mode/scripts"
if [[ ! -d node_modules ]]; then
  echo 'Run bun install --frozen-lockfile in plugins/pstack/skills/poteto-mode/scripts first.' >&2
  exit 1
fi
bun test watch-pr check-plan.test.ts
bun run typecheck
