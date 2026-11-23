# Upstream

This Codex port tracks Lauren Tan's MIT-licensed `pstack` plugin from the official
[`cursor/plugins`](https://github.com/cursor/plugins/tree/main/pstack) repository.

- Upstream version: `0.15.46`
- Upstream commit: `0b46ec399d55f2829e88822998f53b84944837d3`
- Upstream subtree: `pstack/`
- Port target: Codex skills, subagent collaboration tools, local session records,
  Codex goals/automations, and Codex-native browser/computer-use verification.

The engineering workflows, playbooks, principles, helper scripts, docs, and Benny
automation reference pack are retained. Cursor-only tool names and filesystem
locations are adapted against `CODEX.md`. The old bulk replacement script refuses
to run: it cannot preserve semantic adaptations. Use the native repository's
upstream audit script, review each upstream change, and rerun validation and tests.

Upstream does not bundle an MCP server or lifecycle hook. The `why` and related
workflows dynamically use whichever MCP/app tools are available in the active
Codex session, matching the upstream runtime-discovery behavior.
