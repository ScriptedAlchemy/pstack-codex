#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
command -v codex >/dev/null || { echo 'Codex CLI is required.' >&2; exit 1; }
"$repo_root/scripts/validate.sh"
codex plugin marketplace add "$repo_root"
codex plugin add pstack@pstack-codex
# shellcheck disable=SC2016
printf '%s\n' 'Installed. Start a new Codex task and invoke $setup-pstack.'
