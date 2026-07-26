#!/usr/bin/env node

import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createOfferPrep } from "./offer-prep.mjs";

const root = mkdtempSync(join(tmpdir(), "jobhunt-offer-prep-"));
try {
	mkdirSync(join(root, "offers"), { recursive: true });
	writeFileSync(join(root, "offers", "acme-offer.pdf"), "synthetic PDF bytes");
	const text =
		"Base salary: USD 180,000 annually.\nEquity: 20,000 options, vesting terms in the plan.\nNon-compete: 18 months worldwide.\n";
	writeFileSync(join(root, "offers", "acme-offer.txt"), text);
	const input = {
		schemaVersion: 1,
		company: "Acme",
		role: "Platform Engineer",
		trackerNum: 42,
		offerDocument: "offers/acme-offer.pdf",
		extractedTextPath: "offers/acme-offer.txt",
		terms: [
			{
				type: "base_salary",
				value: "180,000 annually",
				currency: "USD",
				evidence: {
					excerpt: "Base salary: USD 180,000 annually.",
					page: 1,
					label: "base salary",
				},
			},
		],
		risks: [
			{
				severity: "high",
				topic: "Non-compete scope",
				why: "The duration and geography are broad.",
				evidence: {
					excerpt: "Non-compete: 18 months worldwide.",
					page: 3,
					label: "non-compete",
				},
				needsProfessionalAdvice: true,
			},
		],
		questions: ["Which equity plan and strike price apply?"],
		priorities: ["Clarify equity before optimizing headline value."],
		negotiationDraft: {
			subject: "Acme offer questions",
			body: "Thank you for the offer. After reviewing it, I would like to clarify the equity and non-compete terms.",
		},
		humanReviewRequired: true,
		sendPerformedByTool: false,
		acceptancePerformedByTool: false,
	};
	const result = await createOfferPrep({ root, input });
	assert.equal(result.sendPerformedByTool, false);
	assert.equal(result.acceptancePerformedByTool, false);
	const snapshot = JSON.parse(
		readFileSync(join(root, result.snapshot), "utf8"),
	);
	assert.equal(snapshot.artifact.offerSha256.length, 64);
	assert.equal(snapshot.artifact.notLegalOrTaxAdvice, true);
	assert.match(readFileSync(join(root, result.draft), "utf8"), /Do Not Send/);
	await assert.rejects(
		createOfferPrep({
			root,
			input: {
				...input,
				company: "Other",
				terms: [
					{
						...input.terms[0],
						evidence: {
							...input.terms[0].evidence,
							excerpt: "Invented term",
						},
					},
				],
			},
		}),
		/not found exactly/,
	);
	symlinkSync(
		join(root, "offers", "acme-offer.pdf"),
		join(root, "offers", "linked.pdf"),
	);
	await assert.rejects(
		createOfferPrep({
			root,
			input: { ...input, offerDocument: "offers/linked.pdf" },
		}),
		/symlink/,
	);
} finally {
	rmSync(root, { recursive: true, force: true });
}

console.log(
	"Sensitive offer extraction and draft-only negotiation tests passed",
);
