import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-bug-evidence.mjs", import.meta.url));

function record() {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-bug-evidence-"));
	const artifacts = [];
	const add = (name, body, disposition = "ship") => {
		const artifactPath = path.join(directory, name);
		fs.writeFileSync(artifactPath, body);
		artifacts.push({ path: name, sha256: createHash("sha256").update(body).digest("hex"), disposition });
		return name;
	};
	const fixture = add("fixture.json", '{"input":"same"}');
	const probe = add("probe.json", '{"probe":"same"}');
	const baselineOutput = add("baseline.log", "original failure");
	const fixedOutput = add("fixed.log", "fixed pass");
	const makeRun = (outcome, output, codeRef, overrides = {}) => ({
		codeRef,
		patch: null,
		layer: "api",
		entryPoint: "POST /evaluate",
		command: "npm run check",
		cwd: ".",
		environment: "node 22",
		fixture,
		probe,
		adapter: null,
		outcome,
		observation: outcome === "fail" ? "returns stale result" : "returns updated result",
		artifacts: [output],
		...overrides,
	});
	const evidence = {
		version: 1,
		ticket: "BUG-42",
		scope: "Evaluation response",
		excluded: [],
		requirements: [
			{
				id: "R1",
				claim: "Original report reproduces",
				source: "BUG-42",
				kind: "repro",
				layer: "api",
				scenario: "submit the same input",
				baseline: makeRun("fail", baselineOutput, "a".repeat(40)),
				fixed: makeRun("pass", fixedOutput, "b".repeat(40)),
			},
			{
				id: "R2",
				claim: "Regression stays correct",
				source: "derived from BUG-42",
				kind: "regression",
				layer: "api",
				scenario: "submit the same input",
				baseline: makeRun("pass", baselineOutput, "a".repeat(40)),
				fixed: makeRun("pass", fixedOutput, "b".repeat(40)),
			},
		],
		discoveries: [],
		artifacts,
		shippingFiles: [],
	};
	return { directory, evidence, add, fixture, probe };
}

function check(context, { complete = false, raw = null } = {}) {
	const file = path.join(context.directory, "evidence.json");
	fs.writeFileSync(file, raw ?? JSON.stringify(context.evidence));
	return spawnSync(process.execPath, [checker, file, ...(complete ? ["--complete"] : [])], { encoding: "utf8", timeout: 5000 });
}

function clean(context, fn) {
	try {
		fn(context);
	} finally {
		fs.rmSync(context.directory, { recursive: true, force: true });
	}
}

test("complete fail/pass reproduction and pass/pass regression are accepted", () => clean(record(), (context) => {
	const result = check(context, { complete: true });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /consistency and completeness checks passed/u);
}));

test("open requirements are reported in default mode and rejected for completion", () => clean(record(), (context) => {
	context.evidence.requirements[0].fixed = null;
	const result = check(context);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Open requirements: R1/u);
	const completed = check(context, { complete: true });
	assert.equal(completed.status, 1);
	assert.match(completed.stderr, /requirements\[0\]\.fixed/u);
}));

test("a reproduction with a passing baseline remains open", () => clean(record(), (context) => {
	context.evidence.requirements[0].baseline.outcome = "pass";
	const result = check(context);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Open requirements: R1/u);
	const completed = check(context, { complete: true });
	assert.equal(completed.status, 1);
	assert.match(completed.stderr, /original reproductions require a failing baseline/u);
}));

test("uppercase spelling of the same commit ID is not a changed code revision", () => clean(record(), (context) => {
	context.evidence.requirements[0].fixed.codeRef = "A".repeat(40);
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /changed codeRef or patch hash/u);
}));

for (const input of ["fixture", "probe"]) {
	test(`paired runs reject changed ${input} content`, () => clean(record(), (context) => {
		const next = context.add(`other-${input}`, "different content");
		context.evidence.requirements[0].fixed[input] = next;
		context.evidence.artifacts.find((item) => item.path === next).disposition = "ship";
		const result = check(context);
		assert.equal(result.status, 1);
		assert.match(result.stderr, new RegExp(`requirements\\[0\\]\\.fixed\\.${input}`, "u"));
	}));
}

test("run layer must match its requirement", () => clean(record(), (context) => {
	context.evidence.requirements[0].fixed.layer = "browser";
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /requirements\[0\]\.fixed\.layer/u);
}));

test("missing and tampered artifacts are rejected", () => {
	for (const kind of ["missing", "tampered"]) clean(record(), (context) => {
		const artifact = context.evidence.artifacts[0];
		if (kind === "missing") fs.rmSync(path.join(context.directory, artifact.path));
		else fs.writeFileSync(path.join(context.directory, artifact.path), "changed");
		const result = check(context);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /artifacts\[0\]\.(?:path|sha256)/u);
	});
});

test("duplicate requirement IDs are rejected", () => clean(record(), (context) => {
	context.evidence.requirements[1].id = "R1";
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /requirements\[1\]\.id/u);
}));

test("duplicate artifact paths are rejected after resolution", () => clean(record(), (context) => {
	const absolute = path.join(context.directory, context.evidence.artifacts[0].path);
	context.evidence.artifacts.push({ ...context.evidence.artifacts[0], path: absolute });
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /artifacts\[4\]\.path/u);
}));

test("malformed JSON has a concise error and no stack trace", () => clean(record(), (context) => {
	const result = check(context, { raw: "{" });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /cannot read valid JSON/u);
	assert.doesNotMatch(result.stderr, / at .*:\d+:\d+/u);
}));

test("required discoveries must reference an existing requirement", () => clean(record(), (context) => {
	context.evidence.discoveries.push({ finding: "A required path", disposition: "required", reason: "reproduces report", requirement: "missing" });
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /discoveries\[0\]\.requirement/u);
}));

test("follow-up discoveries require durable tracking", () => clean(record(), (context) => {
	context.evidence.discoveries.push({ finding: "Separate concern", disposition: "follow-up", reason: "outside scope" });
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /discoveries\[0\]\.tracking/u);
}));

test("retained artifacts cannot be declared for shipping", () => clean(record(), (context) => {
	const retained = context.add("notes.txt", "keep for investigation", "retain");
	context.evidence.shippingFiles.push(retained);
	const result = check(context);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /shippingFiles\[0\]/u);
}));

test("temporary run evidence is allowed while open and rejected at completion", () => clean(record(), (context) => {
	context.evidence.artifacts.find((item) => item.path === "fixed.log").disposition = "temporary";
	const open = check(context);
	assert.equal(open.status, 0, open.stderr);
	const completed = check(context, { complete: true });
	assert.equal(completed.status, 1);
	assert.match(completed.stderr, /temporary in --complete mode/u);
}));

test("excluded entries and code references are validated as strings", () => {
	for (const update of [
		(context) => { context.evidence.excluded.push(42); },
		(context) => { context.evidence.requirements[0].fixed.codeRef = 42; },
	]) clean(record(), (context) => {
		update(context);
		const result = check(context);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /(?:excluded\[0\]|requirements\[0\]\.fixed\.codeRef)/u);
	});
});

test("command strings are recorded but never executed", () => clean(record(), (context) => {
	const marker = path.join(context.directory, "command-ran");
	const malicious = `node -e "require('fs').writeFileSync('${marker}', 'ran')"`;
	context.evidence.requirements[0].fixed.command = malicious;
	const result = check(context, { complete: true });
	assert.equal(result.status, 0, result.stderr);
	assert.equal(fs.existsSync(marker), false);
}));

test("usage errors return exit code 2", () => {
	const result = spawnSync(process.execPath, [checker], { encoding: "utf8", timeout: 5000 });
	assert.equal(result.status, 2);
	assert.match(result.stderr, /^Usage:/u);
});
