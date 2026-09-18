# Persistent poteto-mode in Codex

For one task, ask: "Use the installed pstack poteto-mode throughout this task."
Preserve that request in the resume capsule. It does not enable a Cursor UI mode.

For repeat use across tasks in one repository, Codex's native equivalent is a
scoped `AGENTS.md`. Only add the following block when the user requests persistent
pstack behavior in that repository. Read and preserve existing instructions;
append the block once rather than replacing the file. A nested `AGENTS.md` can
limit it to a subdirectory. Removing the block disables the standing instruction.

```markdown
## pstack engineering workflow

For engineering work in this directory, use the installed pstack poteto-mode
skill as the routing workflow. Read its SKILL.md and CODEX.md, then read the
matched playbook and applicable principle skills. If pstack is unavailable,
report that rather than pretending it was loaded. Preserve the user's requested
scope and permissions; this instruction does not authorize unrelated changes,
external publishing, production mutations, or unsolicited background services.
```

This is a real Codex instruction mechanism, not a global plugin switch or a
guarantee that a model will always obey. No hook trust bypass is needed. Plugin
installation does not silently alter `AGENTS.md` or enable this in other projects.

See [official AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
