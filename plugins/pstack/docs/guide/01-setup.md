# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

From a shell, register your clone's marketplace and install:

```bash
codex plugin marketplace add /absolute/path/to/pstack-codex
codex plugin add pstack@pstack-codex
```

Start a new Codex task after the CLI confirms installation.

For Claude Code, use the separate [upstream pstack distribution](https://github.com/cursor/plugins/tree/main/pstack). This guide describes the Codex port.

## Pick your models

Run:

```text
$setup-pstack
```

[`$setup-pstack`](../../skills/setup-pstack/SKILL.md) reads the models exposed by the current Codex host, asks for a reasoning budget, shows each role, and writes `~/.codex/pstack-models.md`.

The defaults are the same as the `large` budget. Code, prose, and judgment run on `gpt-6-astra` at `xhigh` reasoning, and the review panels and swarm workers run at `high`, except the panels' `gpt-6-luna` seat, which stays at `xhigh`. No role runs above `xhigh`. `medium` lowers each role one level and `small` lowers it two, and both spend fewer tokens. Unsupported tiers use the highest supported effort at or below the target. Existing model choices and inheritance aliases stay intact.

You only override what you care about. A role with no line in the rule keeps the skill's default. To restore a default, delete that role's line. A rerun of `$setup-pstack` preserves configured role values, including lists and inheritance aliases, unless you choose a replacement. When a default changes, a rule written before the change still pins the old default until you run `$setup-pstack` again. That run replaces the old defaults it recognizes, tells you which, and keeps your other choices. To drop a pin it does not recognize, delete that role's line or the file first. Setup drops retired role lines and reports them before writing.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `$swarm` worker unless a race names a model for each arm.

## Accept the verification offers, or don't

At the end of setup, `$setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`$create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.agents/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `$create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers when it earns its place.

Then setup offers once to generate a formal verification skill with [`$create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

After setup, start a new task so the custom agents are reloaded.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `$setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `$poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
$poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt.

For continued use, ask Codex to follow poteto-mode throughout this task. Record that instruction in resume notes. No Cursor-style sticky-mode registration is installed.

Next: [Route work through `$poteto-mode`](./02-poteto-mode.md).
