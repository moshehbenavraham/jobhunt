import { describe, expect, it } from "vitest";
import { extractSections } from "./extract-sections";

describe("extractSections", () => {
	it("returns empty array for null body", () => {
		expect(extractSections(null)).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(extractSections("")).toEqual([]);
	});

	it("returns empty array when no ## headings exist", () => {
		const body = "# Top heading\nSome content\n### Sub heading\n";
		expect(extractSections(body)).toEqual([]);
	});

	it("parses ## headings into TOC entries", () => {
		const body = [
			"# Title",
			"## Overview",
			"Some body text.",
			"## Score Analysis",
			"More text.",
			"## Final Verdict",
		].join("\n");

		const result = extractSections(body);

		expect(result).toEqual([
			{ id: "overview", text: "Overview" },
			{ id: "score-analysis", text: "Score Analysis" },
			{ id: "final-verdict", text: "Final Verdict" },
		]);
	});

	it("strips markdown formatting from heading text", () => {
		const body = [
			"## **Bold heading**",
			"## *Italic heading*",
			"## `Code heading`",
			"## ~~Strikethrough~~",
			"## [Link text](https://example.com)",
		].join("\n");

		const result = extractSections(body);

		expect(result).toEqual([
			{ id: "bold-heading", text: "Bold heading" },
			{ id: "italic-heading", text: "Italic heading" },
			{ id: "code-heading", text: "Code heading" },
			{ id: "strikethrough", text: "Strikethrough" },
			{ id: "link-text", text: "Link text" },
		]);
	});

	it("generates unique anchor IDs for duplicate headings", () => {
		const body = [
			"## Overview",
			"## Details",
			"## Overview",
			"## Overview",
		].join("\n");

		const result = extractSections(body);

		expect(result).toEqual([
			{ id: "overview", text: "Overview" },
			{ id: "details", text: "Details" },
			{ id: "overview-2", text: "Overview" },
			{ id: "overview-3", text: "Overview" },
		]);
	});

	it("handles mixed spacing after ##", () => {
		const body = [
			"##  Double space heading",
			"##    Extra spaces heading",
		].join("\n");

		const result = extractSections(body);

		expect(result).toHaveLength(2);
		expect(result[0]?.text).toBe("Double space heading");
		expect(result[1]?.text).toBe("Extra spaces heading");
	});

	it("ignores headings that result in empty text after stripping", () => {
		const body = "## \n## Real heading\n";
		const result = extractSections(body);

		expect(result).toEqual([{ id: "real-heading", text: "Real heading" }]);
	});
});
