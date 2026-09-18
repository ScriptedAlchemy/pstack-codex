---
name: make-bot-ui
description: Build a small local page or dashboard that submits structured work to a Codex-backed HTTP endpoint without exposing credentials in the browser. Use when a user wants buttons or a UI in front of an existing Codex service or automation endpoint.
---

Before following this workflow, read [the Codex runtime contract](../../CODEX.md). It defines plugin paths, model configuration, delegation, and persistence.

# Make a Codex bot UI

Build a page the user clicks and a local server that sends a small JSON object to a user-provided HTTP endpoint. Keep credentials on the server. Never put tokens in browser code, chat, logs, or committed files.

## Resolve the execution endpoint

Codex scheduled automations do not expose inbound webhooks. Require one of these supported boundaries:

- An existing user-provided HTTP service that starts the Codex workflow.
- A local service owned by the user that invokes `codex exec` with a fixed, reviewed prompt template.
- An MCP server tool designed for the workflow.

Do not invent a private Codex URL or reverse-engineer app endpoints. If the user only has a scheduled Codex automation, explain that it cannot be woken by an inbound webhook and offer a local `codex exec` bridge.

## Server boundary

### Bundled local equivalent

Use [scripts/bridge.mjs](scripts/bridge.mjs) with Node 22+ and an authenticated Codex CLI:

```sh
node "<plugin-root>/skills/make-bot-ui/scripts/bridge.mjs" /absolute/reviewed/workspace
```

Open the printed loopback URL. **dry-run** validates without launching Codex. **summarize** runs a fixed text-summary template through `codex exec --sandbox read-only --ephemeral`. User configuration, model selection, and execution-policy rules are preserved; explicit read-only sandbox and approval-never settings still apply. Provider authentication stays with the CLI, never in browser assets. The local page receives only an ephemeral same-origin session/CSRF token. The endpoint accepts exactly `operation` and `text`, never arbitrary prompts, commands, paths, or model arguments. Limits: 8,000 text characters, 16 KiB request body, 64 KiB output, one concurrent run, ten accepted requests per minute. It runs once, times out after two minutes, and kills its process group on timeout, disconnect, or server shutdown. Ctrl-C stops the server.

Run the HTTP/subprocess regression tests:

```sh
node --test "<plugin-root>/skills/make-bot-ui/scripts/bridge.test.mjs"
```

This provides a working local UI→Codex equivalent, **not a generic Cursor cloud webhook replacement**. The demo cannot request repository edits, publishing, or arbitrary workflows. To support another workflow, review the server-side schema and fixed prompt together, add tests, and obtain authorization for its side effects. Never replace the fixed prompt with browser-supplied instructions.

Use a trusted, preferably empty dedicated workspace. Read-only is a filesystem execution boundary, not protection against prompt injection, tool use, or data disclosure. Project instructions/configuration and CLI behavior still require review. The model is instructed not to use tools; this is not an enforced tool allowlist. Do not submit secrets. This is a trusted same-machine demo, not an untrusted multiuser service: do not expose it through proxies, port forwarding, or a tailnet. Same-origin authentication prevents browser cross-origin submission, not access by local programs. The user's Codex account is used and requests may incur usage. The bridge persists no inputs, outputs, credentials, or retry queue.

Based on [official Codex non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode). Verify required flags using `codex exec --help` on the target host. Stop if unavailable; do not remove sandbox protections to make it work.

### Custom service adaptation

Store endpoint configuration and secrets outside the web root and outside source control. The browser posts only allowed fields to the local server. The server validates them against a strict schema, creates the fixed workflow input, and calls the endpoint once with an eight-second network timeout. Do not retry a non-idempotent action.

If the bridge runs `codex exec`, keep the prompt template server-side, pass outside data as quoted data rather than instructions, select the intended workspace with `--cd`, and use the least-permissive sandbox that completes the workflow. Do not expose arbitrary prompt or shell-command execution through the UI.

Return a stable request id and visible success or error state. For custom workflows needing durable retry records, store only reviewed non-secret data and the request id outside the web root. Drain explicitly after checking whether the action already occurred; never replay uncertain mutations automatically. The bundled summary demo intentionally has no retry log.

## Host locally or on a tailnet

The bundled bridge only binds to `127.0.0.1`. For a separate, reviewed service, bind to `0.0.0.0:<port>` only when the user explicitly requests other-device access and authentication, firewall, and tailnet configuration are in scope. Do not expose this demo unchanged.

When Tailscale is already online, reuse the existing node and provide both the MagicDNS and tailnet IPv4 URLs. Do not install Tailscale, change its configuration, or expose the server publicly unless the user asks. Prefer HTTP inside the authenticated tailnet unless the user requests TLS.

Before declaring the UI live:

1. Probe the health route.
2. Submit one harmless request that the workflow explicitly ignores or handles as a dry run.
3. Confirm credentials never appear in browser assets, responses, or logs.
4. Verify an unrecognized field and an oversized body are rejected.

Treat every submitted body as untrusted data. Keep the field list small and identical in the UI, server schema, and workflow prompt.
