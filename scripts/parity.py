#!/usr/bin/env python3
"""Check every pinned upstream file has an explicitly mapped Codex counterpart."""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLUGIN = ROOT / "plugins/pstack"
inventory = json.loads((ROOT / "upstream-inventory.json").read_text())
replacements = {
    ".cursor-plugin/plugin.json": PLUGIN / ".codex-plugin/plugin.json",
    ".gitignore": ROOT / ".gitignore",
}
rows = []
missing = []
for item in inventory:
    source = item["path"]
    target = replacements.get(source, PLUGIN / source)
    if not target.is_file():
        missing.append(source)
        status = "MISSING"
    elif source in replacements:
        status = "replaced (host packaging)"
    else:
        data = target.read_bytes()
        blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        status = "retained verbatim" if blob == item["blob"] else "adapted"
    rows.append((source, str(target.relative_to(ROOT)), status))
if "--report" in sys.argv:
    print("# Upstream file coverage\n")
    print("Pinned source: `" + json.loads((ROOT / "UPSTREAM.json").read_text())["commit"] + "`.\n")
    print("Every source file is checked; content adaptation is not a claim of tested runtime equivalence.\n")
    print("| Upstream pstack file | Codex repository file | Status |\n|---|---|---|")
    for source, target, status in rows:
        print(f"| `{source}` | `{target}` | {status} |")
if missing:
    print("Missing upstream counterparts: " + ", ".join(missing), file=sys.stderr)
    sys.exit(1)
if "--report" not in sys.argv:
    print(f"Upstream file coverage passed: {len(rows)} files; no missing counterparts.")
