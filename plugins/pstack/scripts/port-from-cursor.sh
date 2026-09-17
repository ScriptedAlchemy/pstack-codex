#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' 'Automatic text replacement is not a safe Cursor-to-Codex port.' 'Use the repository scripts/check-upstream.sh, review the upstream diff, and adapt it against CODEX.md.' >&2
exit 1
