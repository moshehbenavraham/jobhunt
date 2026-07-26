#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const dockerfile = read("Dockerfile");
const compose = read("docker-compose.yml");
const ignore = read(".dockerignore");
const smoke = read("scripts/container-smoke.sh");
const packageJson = JSON.parse(read("package.json"));
const goMod = read("dashboard/go.mod");
const lock = JSON.parse(read("package-lock.json"));
const version = read("VERSION").trim();

assert.match(dockerfile, /^FROM golang:1\.25\.0-bookworm AS go-toolchain$/m);
assert.match(dockerfile, /^FROM node:24\.14\.0-bookworm-slim$/m);
assert.match(goMod, /^go 1\.25\.0$/m);
assert.equal(lock.packages["node_modules/playwright"].version, "1.59.1");
assert.match(dockerfile, /npx playwright install --with-deps chromium/);
assert.match(dockerfile, /mupdf-tools/);
assert.match(dockerfile, /poppler-utils/);
assert.match(dockerfile, /qpdf/);
assert.match(dockerfile, /npm run app:build/);
assert.match(dockerfile, /go test \.\/\.\.\./);

assert.match(compose, /127\.0\.0\.1:5172:5172/);
assert.match(compose, /127\.0\.0\.1:4175:4175/);
assert.match(compose, /\.:\s*\/workspace/);
assert.match(compose, /node-modules:\/workspace\/node_modules/);
assert.match(compose, /scripts\/container-smoke\.sh/);
assert.match(compose, /shm_size: 1gb/);

for (const privatePath of [
	"profile/cv.md",
	"config/profile.yml",
	"config/portals.yml",
	"modes/_profile.md",
	"data/*",
	"reports/*",
	"output/*",
	".jobhunt-app",
	"offers",
]) {
	assert.ok(
		ignore.includes(privatePath),
		`.dockerignore misses ${privatePath}`,
	);
}

assert.match(smoke, /npm run doctor/);
assert.match(smoke, /node scripts\/test-scan\.mjs/);
assert.match(smoke, /node scripts\/test-pdf-pipeline\.mjs/);
assert.equal(packageJson.version, version);
assert.equal(lock.version, version);
assert.equal(lock.packages[""].version, version);

console.log("container contract tests pass");
