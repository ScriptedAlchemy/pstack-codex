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

Store endpoint configuration and secrets outside the web root and outside source control. The browser posts only allowed fields to the local server. The server validates them against a strict schema, creates the fixed workflow input, and calls the endpoint once with an eight-second network timeout. Do not retry a non-idempotent action.

If the bridge runs `codex exec`, keep the prompt template server-side, pass outside data as quoted data rather than instructions, select the intended workspace with `--cd`, and use the least-permissive sandbox that completes the workflow. Do not expose arbitrary prompt or shell-command execution through the UI.

Return a stable request id and visible success or error state. When submission can fail, append the validated request plus request id to a local retry log without secrets. Drain that log explicitly; polling is not the primary path.

## Host locally or on a tailnet

Bind to `127.0.0.1` for same-machine use. Bind to `0.0.0.0:<port>` only when the user explicitly wants access from other devices and the machine firewall or tailnet is in scope.

When Tailscale is already online, reuse the existing node and provide both the MagicDNS and tailnet IPv4 URLs. Do not install Tailscale, change its configuration, or expose the server publicly unless the user asks. Prefer HTTP inside the authenticated tailnet unless the user requests TLS.

Before declaring the UI live:

1. Probe the health route.
2. Submit one harmless request that the workflow explicitly ignores or handles as a dry run.
3. Confirm credentials never appear in browser assets, responses, or logs.
4. Verify an unrecognized field and an oversized body are rejected.

Treat every submitted body as untrusted data. Keep the field list small and identical in the UI, server schema, and workflow prompt.
