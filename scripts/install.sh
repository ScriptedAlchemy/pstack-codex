#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
command -v codex >/dev/null || { echo 'Codex CLI is required.' >&2; exit 1; }
if [[ -n "$(find "$repo_root/plugins/pstack" -name node_modules -print -quit)" ]]; then
  echo 'Move test-only node_modules outside plugins/pstack before installing; it must not enter the plugin cache.' >&2
  exit 1
fi
"$repo_root/scripts/validate.sh"
codex plugin marketplace add "$repo_root"
codex plugin add pstack@pstack-codex
# shellcheck disable=SC2016
printf '%s\n' 'Installed. Start a new Codex task and invoke $setup-pstack.'
