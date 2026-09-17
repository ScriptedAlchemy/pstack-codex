#!/usr/bin/env python3
"""Portable package preflight; not a substitute for host integration testing."""
import json
import pathlib
import re
import sys
import tomllib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLUGIN = ROOT / "plugins/pstack"
errors = []


def check(ok, message):
    if not ok:
        errors.append(message)


manifest = json.loads((PLUGIN / ".codex-plugin/plugin.json").read_text())
marketplace = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
check(manifest.get("name") == "pstack", "Plugin name must be pstack")
check(re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?", manifest.get("version", "")), "Invalid version")
check("hooks" not in manifest, "hooks is not a supported manifest field; use default discovery")
check(marketplace.get("name") == "pstack-codex", "Wrong marketplace name")
entries = marketplace.get("plugins", [])
check(len(entries) == 1, "Expected one plugin in marketplace")
check(entries and entries[0].get("source") == {"source": "local", "path": "./plugins/pstack"}, "Wrong marketplace source")
for entry in entries:
    check(entry.get("name") == "pstack", "Wrong marketplace plugin name")
    check(entry.get("policy", {}).get("installation") == "AVAILABLE", "Wrong installation policy")
    check(entry.get("policy", {}).get("authentication") == "ON_INSTALL", "Wrong authentication policy")
    check(bool(entry.get("category")), "Missing category")
for key in ("skills", "mcpServers", "apps"):
    path = manifest.get(key)
    if isinstance(path, str):
        resolved = (PLUGIN / path).resolve()
        check(resolved.is_relative_to(PLUGIN.resolve()) and resolved.exists(), f"Missing/escaping manifest path: {key}")
for key in ("logo", "logoDark", "composerIcon"):
    path = manifest.get("interface", {}).get(key)
    if path:
        check((PLUGIN / path).is_file(), f"Missing interface asset: {path}")
skills = sorted((PLUGIN / "skills").glob("*/SKILL.md"))
check(len(skills) == 47, f"Expected 47 reviewed source skills, got {len(skills)}; reconcile upstream inventory before changing this check")
for skill in skills:
    content = skill.read_text()
    check(content.startswith("---\n"), f"Missing frontmatter: {skill}")
    check("../../CODEX.md" in content and (skill.parent / "../../CODEX.md").is_file(), f"Missing runtime contract: {skill}")
    frontmatter = content.split("---", 2)[1] if content.startswith("---") else ""
    check(not re.search(r"^(mode|reminder|disable-model-invocation):", frontmatter, re.M), f"Cursor frontmatter: {skill}")
    metadata = skill.parent / "agents/openai.yaml"
    if skill.parent.name != "setup-pstack":
        check(metadata.is_file() and "allow_implicit_invocation: false" in metadata.read_text(), f"Missing explicit invocation policy: {skill}")
for agent in (PLUGIN / "codex-agents").glob("*.toml"):
    data = tomllib.loads(agent.read_text())
    for key in ("name", "description", "developer_instructions"):
        check(bool(data.get(key)), f"Missing {key} in {agent}")
check((PLUGIN / "LICENSE").is_file(), "Missing upstream license")
if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"Package preflight passed: {len(skills)} skills; marketplace, paths, policies, agents, license.")
