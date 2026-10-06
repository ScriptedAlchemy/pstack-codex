### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** Inspect the current branch and dirty state first. Codex subagents share the host workspace; spawning does not create isolation. Give each concurrent writer an explicitly created worktree and distinct branch at the intended base, and pass the exact absolute directory in its brief. Preserve unrelated edits in place. If the task needs current uncommitted changes, keep one writer in that checkout or copy only the authorized patch into an isolated worktree after inspecting it. Do not reset, discard, stash, or rewrite user work merely to obtain a clean tree. Reconcile tangled state from evidence, and ask when preserving it conflicts with the requested change.

**Commits.** Commit liberally. Rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. New commit when separable.

**PRs.** Run `a focused diff-cleanup pass` from Codex-native verification tools over the diff before commit. Run `$no-comments` before review. Write every PR title, PR description, and commit body with `$technical-writing`, then apply `$unslop`. Apply every technical-writing layer except Diátaxis. Use one word for each action, keep articles, and avoid `-ing` when a plain verb works.

**Titles.** Use Conventional Commits in the form `type(scope): subject`. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf` as the type. Use the changed area, such as `pstack` or `poteto-mode`, as the scope. Keep the subject short and imperative. Name a real symbol when one carries the change. For example, `fix(pstack): retarget opening-a-pr babysit trigger`. Do not add a trailing period.

**Descriptions.** The PR body is a briefing, not the lab notebook. A reviewer who has the diff should learn why the change exists, what it leaves out, what it could break, and how you proved it works, in under a minute. Write short, simple sentences with few identifiers. Do not write walls of text. The squash commit body is the PR body. If the body would make the squash commit longer than about 40 lines, cut the body.

Put each section under a `##` heading, not a bold lead-in, so the sections stand apart. Use these sections in order. Drop a section when it has nothing to say.

- `## Why` gives the problem and the approach in one to three short sentences. Do not list SHAs or rebase genealogy. Do not add a "based on main" preamble.
- `## What changed` has one to three short bullets. Name a real symbol or path only when it carries the change. Name both sides of a rename or retarget.
- `## Scope` always names what the PR covers and what it deliberately leaves out, for example a related follow-up or a known gap. Use one to three short items. Do not list symbols or paths, and do not write a file-by-file essay.
- `## Tradeoffs` names only rejected alternatives that a reviewer would otherwise ask about. Skip this section when there was no real choice.
- `## Blast Radius` gives one or two sentences on who or what the change touches and why that is safe or risky. If main is red, state the cost of leaving it red.
- `## Verification` has one to three bullets. Each bullet names a real run path and its outcome. For a performance change, report one primary number with its unit in `before → after` form. Link the arena or swarm directory for the remaining evidence. Do not include sample-size methodology, swarm recitals, or metric tables.

After these sections, attach videos or screenshots when they prove a claim. Do not paste full SHAs, swarm or arena lane recitals, lever-correction essays, file-by-file checklists, or "CLEAN" verdicts. Put these details in a linked artifact. A commit body does not restate its subject.

**Forge.** Resolve the forge before the first PR operation and keep that choice for create, edit, view, watch, and merge. GitHub CLI (`gh`) is the default. If `command -v origin` succeeds and Origin can resolve the repository, prefer `origin pr ...`. If Origin is absent or cannot resolve the repository, stay on `gh` and record the fallback. Do not require Graphite (`gt`).

**Built-in PR tool.** Prefer a host-provided PR tool for the create, edit, retarget, or ready operations it actually supports. Read its schema and preserve any host tracking it supplies. Use the resolved forge for unsupported operations. After creating a PR through either path, attach it to the current Codex task through the host artifact tool when available.

**Readiness.** Unless the user requests a draft, open the PR ready. With Origin, pass `--status open`; with `gh`, omit `--draft`. Other PR tools must be checked against their actual schemas, not assumed to accept a draft flag. If an unintentionally drafted PR needs to become ready, use the selected forge's ready operation. Re-read the PR before referring to its status.

**Babysit.** Opening a PR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the user asks for one after the whole stack exists. A babysit for each new PR stalls the build and spends checks on commits that later waves restart. Push back when feedback drifts from intent.

A subagent that opens a PR runs `interrogate`, `a focused diff-cleanup pass`, and `$no-comments`. It posts the URL and returns to the parent without babysitting, unless it owns Autopilot-full or Autopilot-stack. That owner's brief authorizes the babysit loop: start it after the code-ready report and report merge-ready or STACK-READY as its playbook requires. The whole-stack waiting rule does not apply to that owner.
