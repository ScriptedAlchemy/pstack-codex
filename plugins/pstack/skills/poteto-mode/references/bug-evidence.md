# Keep evidence for a bug fix

Use this record with the [bug-fix playbook](../playbooks/bug-fix.md) when a bug spans several paths or needs a reusable repro. Keep one current record per task. The lead owns it. Workers return observations and artifact paths instead of editing it concurrently.

## Start the record

Copy [bug-evidence.json](bug-evidence.json) into the approved task directory. The runtime contract defaults to `.codex/pstack-runs/<run-name>/`. Use an existing investigation directory if the task already has one. Do not overwrite a prior record.

Fill `ticket`, `scope`, and the requirement rows from the report and comments. Use `source` to identify the requirement's origin. Add explicit exclusions to `excluded`.

Each row names one observable `claim`, one `scenario`, and its required `layer`. Split distinct recipient roles, implementations, or states when they need separate proof. Choose layer names appropriate to the bug, such as `producer`, `renderer`, `browser`, or `authorization`. These labels are not an ordered scale. Browser evidence cannot replace an authorization check merely because it exercises more code.

Set `kind` to `repro` for the reported defect. Set it to `regression` for behavior that must remain correct. Only a repro needs a failing baseline. A regression may pass on both revisions or have no baseline run.

Record discovered work in `discoveries`. Each entry has `finding`, `reason`, and `disposition`. A `required` or `dependency` entry names an existing `requirement` ID. A `follow-up` entry has a `tracking` pointer to a durable note or issue. Do not move an unmet acceptance criterion to follow-ups without the user's scope decision.

## Record a run

Leave `baseline` or `fixed` as `null` until that run exists. Use this shape for a run. Values below illustrate the fields and are not evidence.

```json
{
  "codeRef": "0123456789012345678901234567890123456789",
  "patch": null,
  "layer": "producer",
  "entryPoint": "assignReport",
  "command": "node repro.mjs fixture.json",
  "cwd": "/work/baseline",
  "environment": "Node 22; local services; fixed clock; notification flag enabled",
  "fixture": "fixture.json",
  "probe": "repro.mjs",
  "adapter": null,
  "outcome": "fail",
  "observation": "Expected the organization label in the producer output; it was absent.",
  "artifacts": ["before.txt"]
}
```

Use a full immutable commit ID for `codeRef`. If testing uncommitted edits, register the saved patch and reference it in `patch`. Include relevant untracked source in the saved snapshot. Refs and patch files identify the code used for the run, not the current branch name.

`fixture` identifies the business input or deterministic seed recipe. `probe` identifies the executable check or exact manual verification recipe. Save both as files. Record prerequisites, relevant flags, hosts, ports, clock, and reset procedure in `environment` or the probe. Different worktrees use different `cwd` values but the same relevant environment.

Use `adapter` for a registered note or script explaining a baseline compatibility adjustment. An adapter never waives fixture or probe identity. Keep the shared probe compatible with both revisions when possible. If its logic changes, rerun the baseline and fixed code with the new probe.

Choose `outcome` from `fail`, `pass`, `blocked`, or `unverified`. A `fail` means the discriminating assertion reproduced the defect. A dependency, build, authentication, or browser-launch failure means `blocked`. Record the actual observation. Keep at least one output artifact for a pass or failure.

For data-propagation bugs, invoke each revision's real producer with the same business inputs. Do not insert the missing field into the baseline fixture. A template-only comparison can pass on both revisions when the producer is broken. Give that comparison a renderer regression row and retain separate producer evidence.

For visual comparisons, keep fixtures, time, assets, viewport, and comparison axis stable. Save subject and link observations separately when screenshots cannot show them. For navigation bugs, observe the actual selected entity after authentication and context switching. Test denied access separately when the requirement crosses an authorization boundary.

## Register and retain the files

Every file referenced by a run belongs in `artifacts`. File paths resolve relative to the evidence record. Absolute paths also work. Each entry contains `path`, `sha256`, and `disposition`. Compute SHA-256 from the saved file bytes, for example with `shasum -a 256 fixture.json`.

Use `ship` for a retained regression check or other intended release file. Use `retain` for development evidence and rerun inputs stored outside the release diff. Use `temporary` for disposable material that no completed proof needs. Do not put credentials in the record or its artifacts.

Populate `shippingFiles` with the actual intended release paths after inspecting each repository's diff. The checker rejects declared retained or temporary artifacts in that list. It does not discover Git changes or certify that the list is complete. Inspect the real diff before committing. Record a concrete retention location for reusable tools and evidence even when they do not ship.

## Check the record

Run the checker from the loaded plugin root. Replace the example path with the task's evidence file.

```sh
node skills/poteto-mode/scripts/check-bug-evidence.mjs /task/evidence.json
node skills/poteto-mode/scripts/check-bug-evidence.mjs /task/evidence.json --complete
```

The first command checks the record and file integrity while allowing unfinished work. The second also requires a failed baseline for every repro, passing fixed evidence for every requirement, and retained rerun inputs. It requires at least one repro. An already-correct regression does not need to fail first.

The checker verifies referenced files and their hashes. Paired runs must match the requirement's layer, entry point, relevant environment, fixture content, and probe content. A repro pair must identify different code through its commit or patch. Changed inputs invalidate the old comparison until both revisions are rerun. A passing baseline cannot satisfy a completed repro.

The checker never executes recorded commands. Exit code 0 means the entered record is consistent. It does not prove that commands ran, screenshots show the claimed state, inputs exercised the actual producer, shipping declarations match Git, or the requirement list covers the ticket. Inspect those facts directly before claiming completion.

When a task resumes, read this current record, inspect the actual checkouts and processes, and refresh stale evidence. Keep decision history in the existing [show-me-your-work log](../../show-me-your-work/SKILL.md) when that workflow applies. Do not use the current record as a second append-only history.
