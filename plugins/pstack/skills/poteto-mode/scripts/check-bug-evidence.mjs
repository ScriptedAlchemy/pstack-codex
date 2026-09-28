#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import process from "node:process";

const usage = "Usage: node check-bug-evidence.mjs <evidence.json> [--complete]";
const args = process.argv.slice(2);
if (args.length < 1 || args.length > 2 || (args.length === 2 && args[1] !== "--complete")) {
	console.error(usage);
	process.exit(2);
}

const file = path.resolve(args[0]);
const complete = args.includes("--complete");
const fail = (field, message) => {
	throw new Error(`${field}: ${message}`);
};
const object = (value, field) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) fail(field, "must be an object");
	return value;
};
const string = (value, field) => {
	if (typeof value !== "string" || !value.trim()) fail(field, "must be a nonempty string");
	return value;
};
const array = (value, field) => {
	if (!Array.isArray(value)) fail(field, "must be an array");
	return value;
};
const choice = (value, values, field) => {
	if (!values.includes(value)) fail(field, `must be one of ${values.join(", ")}`);
	return value;
};
const digest = (contents) => createHash("sha256").update(contents).digest("hex");

try {
	let evidence;
	try {
		evidence = JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (error) {
		fail(file, `cannot read valid JSON (${error.message})`);
	}
	evidence = object(evidence, "evidence");
	if (evidence.version !== 1) fail("version", "must be 1");
	string(evidence.ticket, "ticket");
	string(evidence.scope, "scope");
	for (const [name, values] of [["excluded", evidence.excluded], ["requirements", evidence.requirements], ["discoveries", evidence.discoveries], ["artifacts", evidence.artifacts], ["shippingFiles", evidence.shippingFiles]]) array(values, name);
	for (const [index, item] of evidence.excluded.entries()) string(item, `excluded[${index}]`);

	const root = path.dirname(file);
	const resolved = (value, field) => path.resolve(root, string(value, field));
	const artifacts = new Map();
	for (const [index, raw] of evidence.artifacts.entries()) {
		const field = `artifacts[${index}]`;
		const artifact = object(raw, field);
		const artifactPath = resolved(artifact.path, `${field}.path`);
		if (artifacts.has(artifactPath)) fail(`${field}.path`, `duplicates ${artifactPath}`);
		string(artifact.sha256, `${field}.sha256`);
		if (!/^[a-f\d]{64}$/i.test(artifact.sha256)) fail(`${field}.sha256`, "must be a 64-character SHA-256 hex digest");
		choice(artifact.disposition, ["ship", "retain", "temporary"], `${field}.disposition`);
		let bytes;
		try {
			bytes = fs.readFileSync(artifactPath);
		} catch (error) {
			fail(`${field}.path`, `cannot read ${artifactPath} (${error.message})`);
		}
		if (bytes.length === 0) fail(`${field}.path`, "file must be nonempty");
		const actual = digest(bytes);
		if (actual !== artifact.sha256.toLowerCase()) fail(`${field}.sha256`, `does not match ${artifactPath}`);
		const entry = { ...artifact, hash: actual };
		artifacts.set(artifactPath, entry);
	}

	const artifactRef = (value, field, { optional = false, survive = false } = {}) => {
		if (optional && value === null) return null;
		const artifactPath = resolved(value, field);
		const artifact = artifacts.get(artifactPath);
		if (!artifact) fail(field, `must name a registered artifact (${artifactPath})`);
		if (complete && survive && artifact.disposition === "temporary") fail(field, "required run evidence cannot be temporary in --complete mode");
		return artifact;
	};
	const run = (raw, field, requirement) => {
		if (raw === null) return null;
		const value = object(raw, field);
		string(value.codeRef, `${field}.codeRef`);
		if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(value.codeRef)) fail(`${field}.codeRef`, "must be a full 40- or 64-character Git commit ID");
		artifactRef(value.patch, `${field}.patch`, { optional: true, survive: true });
		string(value.layer, `${field}.layer`);
		if (value.layer !== requirement.layer) fail(`${field}.layer`, `must match requirements[${requirement.index}].layer (${requirement.layer})`);
		for (const key of ["entryPoint", "command", "cwd", "environment", "fixture", "probe", "observation"]) string(value[key], `${field}.${key}`);
		const fixture = artifactRef(value.fixture, `${field}.fixture`, { survive: true });
		const probe = artifactRef(value.probe, `${field}.probe`, { survive: true });
		artifactRef(value.adapter, `${field}.adapter`, { optional: true, survive: true });
		choice(value.outcome, ["fail", "pass", "blocked", "unverified"], `${field}.outcome`);
		const outputs = array(value.artifacts, `${field}.artifacts`);
		for (const [index, output] of outputs.entries()) artifactRef(output, `${field}.artifacts[${index}]`, { survive: true });
		if (["fail", "pass"].includes(value.outcome) && outputs.length === 0) fail(`${field}.artifacts`, "must include an output artifact for pass/fail outcomes");
		return { ...value, fixtureHash: fixture.hash, probeHash: probe.hash };
	};

	const ids = new Set();
	const requirements = evidence.requirements.map((raw, index) => {
		const field = `requirements[${index}]`;
		const value = object(raw, field);
		for (const key of ["id", "claim", "source", "layer", "scenario"]) string(value[key], `${field}.${key}`);
		if (ids.has(value.id)) fail(`${field}.id`, `duplicates requirement ID ${value.id}`);
		ids.add(value.id);
		choice(value.kind, ["repro", "regression"], `${field}.kind`);
		const requirement = { ...value, index };
		requirement.baseline = run(value.baseline, `${field}.baseline`, requirement);
		requirement.fixed = run(value.fixed, `${field}.fixed`, requirement);
		if (requirement.baseline && requirement.fixed) {
			const before = requirement.baseline;
			const after = requirement.fixed;
			for (const key of ["fixtureHash", "probeHash", "entryPoint", "environment", "layer"]) {
				if (before[key] !== after[key]) fail(`${field}.fixed.${key === "fixtureHash" ? "fixture" : key === "probeHash" ? "probe" : key}`, `must match baseline ${key}`);
			}
			if (value.kind === "repro" && before.codeRef.toLowerCase() === after.codeRef.toLowerCase()) {
				const beforePatch = before.patch === null ? null : artifacts.get(resolved(before.patch, `${field}.baseline.patch`)).hash;
				const afterPatch = after.patch === null ? null : artifacts.get(resolved(after.patch, `${field}.fixed.patch`)).hash;
				if (beforePatch === afterPatch) fail(`${field}.fixed`, "original reproduction must use a changed codeRef or patch hash");
			}
		}
		if (complete) {
			if (!requirement.fixed) fail(`${field}.fixed`, "is required in --complete mode");
			if (requirement.fixed.outcome !== "pass") fail(`${field}.fixed.outcome`, "must be pass in --complete mode");
			if (value.kind === "repro" && requirement.baseline?.outcome !== "fail") fail(`${field}.baseline.outcome`, "original reproductions require a failing baseline in --complete mode");
		}
		return requirement;
	});

	for (const [index, raw] of evidence.discoveries.entries()) {
		const field = `discoveries[${index}]`;
		const discovery = object(raw, field);
		string(discovery.finding, `${field}.finding`);
		choice(discovery.disposition, ["required", "dependency", "follow-up"], `${field}.disposition`);
		string(discovery.reason, `${field}.reason`);
		if (["required", "dependency"].includes(discovery.disposition)) {
			string(discovery.requirement, `${field}.requirement`);
			if (!ids.has(discovery.requirement)) fail(`${field}.requirement`, `must name an existing requirement (${discovery.requirement})`);
		}
		if (discovery.disposition === "follow-up") string(discovery.tracking, `${field}.tracking`);
	}

	for (const [index, shippingFile] of evidence.shippingFiles.entries()) {
		const shippingPath = resolved(shippingFile, `shippingFiles[${index}]`);
		const artifact = artifacts.get(shippingPath);
		if (artifact && artifact.disposition !== "ship") fail(`shippingFiles[${index}]`, `is declared for shipping but artifact disposition is ${artifact.disposition}`);
	}
	if (complete && !requirements.some((item) => item.kind === "repro" && item.baseline?.outcome === "fail" && item.fixed?.outcome === "pass")) {
		fail("requirements", "--complete requires at least one original reproduction with a failing baseline and passing fixed result");
	}

	const open = requirements.filter((item) => !item.fixed || item.fixed.outcome !== "pass" || (item.kind === "repro" && item.baseline?.outcome !== "fail")).map((item) => item.id);
	if (open.length) console.log(`Open requirements: ${open.join(", ")}`);
	console.log(complete
		? "Record consistency and completeness checks passed. Recorded evidence still requires review."
		: "Record consistency checks passed. Completion was not checked. Run with --complete before a completion claim, then review the recorded evidence.");
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
