#!/usr/bin/env bash
set -euo pipefail
repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"
expected_url=https://github.com/cursor/plugins.git
actual_url=$(git remote get-url upstream 2>/dev/null) || {
  printf '%s\n' "Missing upstream. Run: git remote add upstream $expected_url" >&2
  exit 1
}
if [[ "$actual_url" != "$expected_url" ]]; then
  printf '%s\n' "Refusing unexpected upstream URL: $actual_url" >&2
  exit 1
fi
pinned_commit=$(python3 -c 'import json; print(json.load(open("UPSTREAM.json"))["commit"])')
[[ "$pinned_commit" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid pinned commit.' >&2; exit 1; }
git fetch --no-tags upstream main
git cat-file -e "$pinned_commit^{commit}"
printf '%s\n' 'Upstream pstack changes since the reviewed pin:'
git log --oneline "$pinned_commit..upstream/main" -- pstack
git diff --stat "$pinned_commit" upstream/main -- pstack
if git diff --quiet "$pinned_commit" upstream/main -- pstack; then
  printf '%s\n' 'No pstack changes since the reviewed source snapshot.'
else
  printf '%s\n' 'Review required. Follow UPDATING.md; translated files have not been changed.'
fi
