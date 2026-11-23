### Opening a PR

Pick reasoning effort for the job under the Subagents section of **poteto-mode**, using only the active execution tool’s supported values.

Invoked at the end of every other playbook.

Work from a git worktree off trunk, and keep unrelated work out of it. Codex subagents share the host workspace, so give each concurrent writer its own explicit worktree and branch, and never reset, discard, or stash user work to get a clean tree. Rebase into small, landable commits. Run a focused diff cleanup pass over the diff before commit.

Title: `type(scope): subject`, naming a real symbol when one carries the change. Body: a one-minute briefing under 40 lines with these `##` headings in order, dropping empty ones: `## Why`, `## What changed`, `## Scope`, `## Tradeoffs` (only rejected alternatives a reviewer would otherwise ask about), `## Blast Radius`, `## Verification`.

Stack follow-ups by base branch. Open PRs ready, through a host-provided PR tool when it supports the operation, checked against its actual schema. Without one, use `gh pr create` without `--draft`, or `origin pr create --status open` when Origin's CLI resolves the repository. Opening a PR does not start a babysit.
