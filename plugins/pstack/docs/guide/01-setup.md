# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

From a shell, register your clone's marketplace and install:

```bash
codex plugin marketplace add /absolute/path/to/pstack-codex
codex plugin add pstack@pstack-codex
```

Start a new Codex task after the CLI confirms installation.

## Pick your models

Run:

```text
$setup-pstack
```

[`$setup-pstack`](../../skills/setup-pstack/SKILL.md) reads the models exposed by the current Codex host, asks for a reasoning budget, shows each role, and writes `~/.codex/pstack-models.md`.

You only override what you care about. A role with no line in the rule keeps the skill's default. To restore a default later, delete that role's line, or just run `$setup-pstack` again.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `$swarm` worker unless a race names a model for each arm.

## Accept the verification offer, or don't

At the end of setup, `$setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`$create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.agents/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `$create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers when it earns its place.

After setup, start a new task so the custom agents are reloaded.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
$poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `$poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

For continued use, ask Codex to follow poteto-mode throughout this task. Record that instruction in resume notes. No Cursor-style sticky-mode registration is installed.

Next: [Route work through `$poteto-mode`](./02-poteto-mode.md).
