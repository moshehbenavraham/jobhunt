#!/usr/bin/env node

/**
 * Banned-terms check for user-visible UI copy.
 *
 * Scans .ts and .tsx files under apps/web/src for banned terms appearing in
 * string literals and JSX text nodes. Exits with code 1 when violations are
 * found.
 *
 * Usage:
 *   node scripts/check-app-ui-copy.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SCAN_ROOT = join(process.cwd(), "apps", "web", "src");

const BANNED_TERMS = [
	"phase",
	"session",
	"payload",
	"endpoint",
	"contract",
	"surface",
	"route message",
	"artifact review surface",
	"canonical",
];

const IGNORE_PATTERNS = [
	/command-palette-types\.ts$/,
	/shell-types\.ts$/,
	/-types\.ts$/,
	/-client\.ts$/,
	/\.test\.(ts|tsx)$/,
	/\.spec\.(ts|tsx)$/,
	/check-app-ui-copy/,
];

function shouldIgnoreFile(filePath) {
	return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function collectFiles(dir) {
	const results = [];

	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);

		if (stat.isDirectory()) {
			results.push(...collectFiles(full));
			continue;
		}

		const ext = extname(full);

		if (ext === ".ts" || ext === ".tsx") {
			results.push(full);
		}
	}

	return results;
}

function extractUserVisibleStrings(source) {
	const matches = [];

	const stringRegex =
		/(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`)/g;
	for (const match of source.matchAll(stringRegex)) {
		const value = match[1] ?? match[2] ?? match[3] ?? "";
		matches.push({ index: match.index, value });
	}

	const jsxTextRegex = />\s*([^<>{}`]+?)\s*</g;

	for (const match of source.matchAll(jsxTextRegex)) {
		const value = match[1].trim();

		if (value.length > 0) {
			matches.push({ index: match.index, value });
		}
	}

	return matches;
}

function getLineNumber(source, index) {
	let line = 1;

	for (let i = 0; i < index && i < source.length; i++) {
		if (source[i] === "\n") {
			line++;
		}
	}

	return line;
}

function isLikelyCodeContext(source, index, value) {
	const lineStart = source.lastIndexOf("\n", index) + 1;
	const lineEnd = source.indexOf("\n", index);
	const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

	if (/^\s*(import|export\s+type|type\s+\w+|interface\s+\w+)/.test(line)) {
		return true;
	}

	if (/^\s*\/[/*]/.test(line)) {
		return true;
	}

	if (
		/\.(id|path|key|status|source|workflow|kind|code)\s*[=!]==?\s*["']/.test(
			line,
		)
	) {
		return true;
	}

	if (/case\s+["']/.test(line)) {
		return true;
	}

	if (/throw\s+new\s+Error/.test(line)) {
		return true;
	}

	if (/console\.(log|warn|error|info|debug)/.test(line)) {
		return true;
	}

	if (/var\(--[a-zA-Z0-9-]+\)/.test(value)) {
		return true;
	}

	if (/^[a-z]+-[a-z]+-/.test(value) && !/\s/.test(value)) {
		return true;
	}

	if (/^\$\{/.test(value) || /\$\{[^}]+\.id\}/.test(value)) {
		return true;
	}

	if (/aria-|role=|id=|htmlFor=|labelledby/.test(line)) {
		return true;
	}

	if (
		/assertRecord|readString|readNumber|readBoolean|readNullable/.test(line)
	) {
		return true;
	}

	if (/Error\(/.test(line) || /new Error/.test(line)) {
		return true;
	}

	if (/\bkey=\{/.test(line)) {
		return true;
	}

	return false;
}

let violations = 0;
const files = collectFiles(SCAN_ROOT);

for (const filePath of files) {
	if (shouldIgnoreFile(filePath)) {
		continue;
	}

	const source = readFileSync(filePath, "utf-8");
	const strings = extractUserVisibleStrings(source);

	for (const { index, value } of strings) {
		if (isLikelyCodeContext(source, index, value)) {
			continue;
		}

		const lower = value.toLowerCase();

		for (const term of BANNED_TERMS) {
			const termRegex = new RegExp(
				`\\b${term.replace(/\s+/g, "\\s+")}\\b`,
				"i",
			);

			if (termRegex.test(lower)) {
				const rel = relative(process.cwd(), filePath);
				const line = getLineNumber(source, index);
				const snippet = value.length > 60 ? `${value.slice(0, 60)}...` : value;

				console.error(
					`VIOLATION: ${rel}:${line} -- banned term "${term}" in: "${snippet}"`,
				);
				violations++;
			}
		}
	}
}

if (violations > 0) {
	console.error(`\n${violations} banned-term violation(s) found.`);
	process.exit(1);
} else {
	console.log("No banned-term violations found.");
	process.exit(0);
}
