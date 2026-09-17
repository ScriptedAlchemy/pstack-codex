#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
validator_python=''
for candidate in "${PSTACK_PYTHON:-python3}" python3.13 python3.12 python3.11; do
  if command -v "$candidate" >/dev/null && "$candidate" -c 'import sys; sys.exit(sys.version_info < (3, 11))' 2>/dev/null; then
    validator_python=$candidate
    break
  fi
done
if [[ -z "$validator_python" ]]; then
  echo 'Validation requires Python 3.11+. Put it on PATH or set PSTACK_PYTHON to its executable.' >&2
  exit 1
fi
"$validator_python" "$repo_root/scripts/validate.py"
"$validator_python" "$repo_root/scripts/parity.py"
