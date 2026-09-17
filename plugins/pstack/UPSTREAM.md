# Upstream

This Codex port tracks Lauren Tan's MIT-licensed `pstack` plugin from the official
[`cursor/plugins`](https://github.com/cursor/plugins/tree/main/pstack) repository.

- Upstream version: `0.15.2`
- Upstream commit: `e31650eea443aaea1e84cc15d88c13f40080b275`
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
