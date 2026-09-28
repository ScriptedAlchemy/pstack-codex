#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
command -v codex >/dev/null || { echo 'Codex CLI is required.' >&2; exit 1; }
if [[ -n "$(find "$repo_root/plugins/pstack" -name node_modules -print -quit)" ]]; then
  echo 'Move test-only node_modules outside plugins/pstack before installing; it must not enter the plugin cache.' >&2
  exit 1
fi
validation_out=$(mktemp -d "${TMPDIR:-/tmp}/pstack-install.XXXXXX")
printf 'Modal validation evidence: %s\n' "$validation_out/check"
uvx --from modal==1.5.5 python "$repo_root/plugins/pstack/scripts/modal-run.py" \
  --source "$repo_root" --out "$validation_out/check" --command 'bash scripts/validate.sh'
codex plugin marketplace add "$repo_root"
codex plugin add pstack@pstack-codex
# shellcheck disable=SC2016
printf '%s\n' 'Installed. Start a new Codex task and invoke $setup-pstack.'
