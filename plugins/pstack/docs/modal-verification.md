# Verification on Modal

All pstack builds and tests execute on Modal. The shared [runtime contract](../CODEX.md#build-and-test-execution) applies to the lead, workers, generated verification skills, and MCP-triggered execution. Existing project commands run inside the remote job. There is no local fallback.

Use the project's existing Modal adapter when it preserves source identity, exit status, logs, artifacts, and cleanup. Otherwise use `scripts/modal-run.py` from the plugin root. It needs `uvx` and configured Modal credentials. The local process only snapshots source, submits the job, streams logs, and downloads artifacts. Node24, Python3.12, Git, ripgrep, and jq are available in the default Linux image. Choose a compatible `--image` when a project needs another runtime. Native macOS/iOS checks are blocked unless the user authorizes a specific local exception.

## Run a command

Resolve `PSTACK` to the installed plugin's absolute path. Use a fresh output directory outside the source checkout for every attempt.

```sh
uvx --from modal==1.5.5 python "$PSTACK/scripts/modal-run.py" \
  --source /path/to/repo --out /tmp/verification-001 \
  --dependency package.json --dependency package-lock.json \
  --setup 'npm ci --ignore-scripts' \
  --command 'npm run build && npm run test:ci'
```

The snapshot contains current tracked file contents, including uncommitted edits and deletions. Add each needed untracked fixture with `--include relative/file`. Git metadata and untracked files are omitted unless explicitly included. Dependency folders, symlinks, `.env` files except examples, `.npmrc`, and `.pypirc` are refused. This is not a secret scanner. Review tracked files and explicit includes for credentials before submitting; other tracked files are uploaded. Inspect the resulting `source.json` before treating a result as proof. Use `--env NAME=value` for explicit non-secret settings and `--secret existing-modal-secret` for credentials. Never copy the host environment or auth files. Setup commands must not contain credentials.

`--dependency` files enter the image before `--setup`, so dependency layers are cached independently of source edits. Include every manifest/config needed by the install, including workspace manifests. Use the project's actual install command and lifecycle requirements; `--ignore-scripts` is suitable only when required setup is performed separately. A private dependency requiring secrets needs a suitable project adapter or installation in the remote job with a Modal secret.

`result.json` records Modal sandbox ID, source hashes, Git HEAD, command, setup, status, and exit code. `command.log` retains output even when the command fails. The process returns the remote exit code. The runner sets `PSTACK_EXECUTOR=modal`; pstack's test and validation shell entry points refuse to run without that marker. This is an accidental-execution guard, not a security boundary against a deliberate bypass. Missing source, authentication, image setup, transport, timeout, or artifact collection produces a blocked record and nonzero exit. It never executes the command locally. Sandboxes terminate in `finally` and have a bounded lifetime even if the local client disappears.

## Browser and Storybook jobs

Run the app and browser in the same job. Use a spec that asserts actual fixture content before recording. Provide non-secret API settings explicitly. An example with a Playwright config that owns its `webServer`:

```sh
uvx --from modal==1.5.5 python "$PSTACK/scripts/modal-run.py" \
  --source /path/to/repo --out /tmp/browser-001 \
  --include playwright.shots.config.ts \
  --include tests/e2e/shots/pr-shots.spec.ts \
  --dependency package.json --dependency package-lock.json \
  --setup 'npm ci --ignore-scripts' \
  --setup 'npx playwright install --with-deps chromium' \
  --env VITE_API_BASE_URL=http://127.0.0.1:9100/api \
  --artifact test-results \
  --command 'npx playwright test -c playwright.shots.config.ts --workers=2'
```

If the existing config has no `webServer`, supply one remote shell command that starts the server, waits for readiness, runs tests, and stops that server with a trap. Bound readiness and test timeouts. Storybook MCP `test-run` must target the Storybook process in that Modal job; a local MCP test process is forbidden even when the app is remote. Read-only deployed Storybook documentation calls are allowed. If an MCP cannot target Modal, report that integration blocked and use a supported remote test CLI when it meets the repository's requirements.

`--artifact` accepts a required relative file/directory and can repeat. Artifacts are returned in `artifacts.tar`, including on a test failure when the files exist. Missing requested artifacts block completion. Preserve traces, PNGs, videos, failed logs, and retries separately. Inspect archives before extracting them. Do not overwrite baseline evidence. Baseline and fixed runs must share the same remote runtime, fixture, probe, and install setup.

The before-after-screenshots skill already bundles `assets/modal_shots.py`. Its local-server alternative is not permitted in pstack without an explicit user exception. Keep that adapter outside product repositories and record which ref/source snapshot each Modal capture used.

## Verify pstack itself

From the pstack source checkout, set `PSTACK="$PWD/plugins/pstack"` and run:

```sh
uvx --from modal==1.5.5 python "$PSTACK/scripts/modal-run.py" \
  --source "$PWD" --out /tmp/pstack-tests-001 \
  --dependency plugins/pstack/skills/poteto-mode/scripts/package.json \
  --dependency plugins/pstack/skills/poteto-mode/scripts/bun.lock \
  --setup 'npm install -g bun@1.3.0' \
  --setup 'cd plugins/pstack/skills/poteto-mode/scripts && bun install --frozen-lockfile' \
  --command 'bash scripts/test.sh'
```

Dependencies stay in Modal and never enter the plugin cache. Host-only integration checks remain separately blocked or untested unless explicitly authorized and run on an appropriate host.
