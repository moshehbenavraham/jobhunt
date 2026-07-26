export type TocEntry = {
	id: string;
	text: string;
};

const HEADING_PATTERN = /^## +(.+)$/;

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function deduplicateId(id: string, seen: Set<string>): string {
	if (!seen.has(id)) {
		seen.add(id);
		return id;
	}

	let counter = 2;

	while (seen.has(`${id}-${counter}`)) {
		counter += 1;
	}

	const unique = `${id}-${counter}`;
	seen.add(unique);
	return unique;
}

function stripInlineFormatting(text: string): string {
	return text
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/__(.+?)__/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/_(.+?)_/g, "$1")
		.replace(/`(.+?)`/g, "$1")
		.replace(/~~(.+?)~~/g, "$1")
		.replace(/\[(.+?)\]\(.+?\)/g, "$1")
		.trim();
}

export function extractSections(body: string | null): TocEntry[] {
	if (!body) {
		return [];
	}

	const lines = body.split("\n");
	const entries: TocEntry[] = [];
	const seen = new Set<string>();

	for (const line of lines) {
		const match = HEADING_PATTERN.exec(line);

		if (!match) {
			continue;
		}

		const rawText = (match[1] ?? "").trim();
		const text = stripInlineFormatting(rawText);

		if (!text) {
			continue;
		}

		const baseId = slugify(text);

		if (!baseId) {
			continue;
		}

		entries.push({
			id: deduplicateId(baseId, seen),
			text,
		});
	}

	return entries;
}
