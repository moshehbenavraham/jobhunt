import { readFileSync } from 'node:fs';

export const LEGACY_COLMAP = Object.freeze({
  num: 1,
  date: 2,
  company: 3,
  role: 4,
  score: 5,
  status: 6,
  pdf: 7,
  report: 8,
  notes: 9,
});

export const HEADER_ALIASES = (() => {
  try {
    return Object.freeze(
      JSON.parse(
        readFileSync(
          new URL('./tracker-aliases.json', import.meta.url),
          'utf8',
        ),
      ),
    );
  } catch (error) {
    throw new Error(
      `Cannot load scripts/tracker-aliases.json: ${error.message}. Restore it with the Job-Hunt updater.`,
    );
  }
})();

export const SCORE_CELL_RE = /^\d+(?:\.\d+)?\/5$/;

export function looksLikeScoreCell(value) {
  const clean = String(value ?? '')
    .replace(/\*\*/g, '')
    .trim();
  return (
    SCORE_CELL_RE.test(clean) ||
    ['N/A', 'DUP', '—', '-'].includes(clean.toUpperCase())
  );
}

export function resolveScoreStatus(first, second) {
  const firstIsScore = looksLikeScoreCell(first);
  const secondIsScore = looksLikeScoreCell(second);
  if (firstIsScore === secondIsScore) return null;
  return firstIsScore
    ? { score: first, status: second }
    : { score: second, status: first };
}

function normalizeHeader(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/\*\*/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
}

export function detectColumns(lines) {
  for (const line of lines) {
    if (!String(line).trimStart().startsWith('|')) continue;
    const cells = line.split('|').map(normalizeHeader);
    const map = {};
    cells.forEach((header, index) => {
      const field = HEADER_ALIASES[header];
      if (field && map[field] === undefined) map[field] = index;
    });
    if (
      ['num', 'company', 'role', 'score', 'status'].every(
        (field) => map[field] !== undefined,
      )
    ) {
      return Object.freeze(map);
    }
  }
  return null;
}

export function resolveColumns(lines) {
  return detectColumns(lines) || LEGACY_COLMAP;
}

export function trackerTableWidth(colmap) {
  return Math.max(...Object.values(colmap)) + 1;
}

export function splitTrackerRow(line, colmap = LEGACY_COLMAP) {
  if (typeof line !== 'string' || !line.trimStart().startsWith('|')) {
    return null;
  }
  const parts = line.split('|').map((part) => part.trim());
  const mappedWidth = trackerTableWidth(colmap);
  const actualCellCount =
    parts.length - (parts[0] === '' ? 1 : 0) - (parts.at(-1) === '' ? 1 : 0);
  if (actualCellCount < mappedWidth - 1) return null;
  return parts;
}

export function parseTrackerRow(line, colmap = LEGACY_COLMAP) {
  const parts = splitTrackerRow(line, colmap);
  if (!parts) return null;
  const number = Number.parseInt(parts[colmap.num], 10);
  if (!Number.isInteger(number) || number <= 0) return null;
  const at = (field) =>
    colmap[field] === undefined ? '' : (parts[colmap[field]] ?? '');
  const row = {
    num: number,
    date: at('date'),
    company: at('company'),
    role: at('role'),
    score: at('score'),
    status: at('status'),
    pdf: at('pdf'),
    report: at('report'),
    notes: at('notes'),
    raw: line,
    parts,
  };
  if (colmap.location !== undefined) row.location = at('location');
  if (colmap.via !== undefined) row.via = at('via');
  return row;
}

export function parseTracker(content) {
  const lines = String(content).split('\n');
  const columns = resolveColumns(lines);
  const rows = [];
  lines.forEach((line, lineIndex) => {
    const row = parseTrackerRow(line, columns);
    if (row) rows.push({ ...row, lineIndex });
  });
  return { lines, columns, rows };
}

function markdownDestination(raw) {
  const value = String(raw).trimStart();
  if (value.startsWith('<')) {
    for (let index = 1; index < value.length; index++) {
      if (value[index] === '\\') index++;
      else if (value[index] === '>') {
        return value.slice(1, index).replace(/\\([\\()<> ])/g, '$1');
      }
    }
    return null;
  }

  let depth = 0;
  let end = value.length;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '\\') {
      index++;
    } else if (value[index] === '(') {
      depth++;
    } else if (value[index] === ')' && depth > 0) {
      depth--;
    } else if (/\s/.test(value[index]) && depth === 0) {
      end = index;
      break;
    }
  }
  const destination = value.slice(0, end).trim();
  return destination ? destination.replace(/\\([\\()<> ])/g, '$1') : null;
}

export function parseMarkdownLinks(value) {
  const links = [];
  let cursor = 0;
  while (cursor < value.length) {
    const labelStart = value.indexOf('[', cursor);
    if (labelStart === -1) break;
    let labelEnd = -1;
    for (let index = labelStart + 1; index < value.length; index++) {
      if (value[index] === '\\') index++;
      else if (value[index] === ']') {
        labelEnd = index;
        break;
      }
    }
    if (labelEnd === -1 || value[labelEnd + 1] !== '(') {
      cursor = labelStart + 1;
      continue;
    }
    let depth = 1;
    let linkEnd = -1;
    for (let index = labelEnd + 2; index < value.length; index++) {
      if (value[index] === '\\') index++;
      else if (value[index] === '(') depth++;
      else if (value[index] === ')' && --depth === 0) {
        linkEnd = index;
        break;
      }
    }
    if (linkEnd === -1) {
      cursor = labelStart + 1;
      continue;
    }
    const target = markdownDestination(value.slice(labelEnd + 2, linkEnd));
    if (target !== null) {
      links.push({
        label: value.slice(labelStart + 1, labelEnd),
        target,
      });
    }
    cursor = linkEnd + 1;
  }
  return links;
}

export function extractTrackerLocalReportPaths(reportCell) {
  const value = String(reportCell ?? '').trim();
  if (!value || ['-', '—'].includes(value)) return [];
  const targets = parseMarkdownLinks(value).map((link) => link.target);
  if (targets.length === 0) targets.push(value);
  const paths = new Set();
  for (const rawTarget of targets) {
    const destination = markdownDestination(rawTarget);
    if (!destination) continue;
    const clean = destination
      .split(/[?#]/, 1)[0]
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
    if (
      /^(?:[a-z][a-z\d+.-]*:|\/\/|\/)/i.test(clean) ||
      clean.split('/').includes('..') ||
      !/^reports\/[^/].*\.md$/i.test(clean)
    ) {
      continue;
    }
    paths.add(clean);
  }
  return [...paths];
}

export function extractTrackerReportNumbers(reportCell) {
  const value = String(reportCell ?? '').trim();
  if (!value || ['-', '—'].includes(value)) return [];
  const numbers = new Set();
  const localPathNumber = (clean) => {
    const match =
      clean.match(/^reports\/0*(\d+)-/i) ||
      clean.match(/^reports\/0*(\d+)\.md$/i);
    const number = match ? Number.parseInt(match[1], 10) : null;
    return Number.isInteger(number) && number > 0 ? number : null;
  };

  const links = parseMarkdownLinks(value);
  for (const path of extractTrackerLocalReportPaths(value)) {
    const pathNumber = localPathNumber(path);
    if (!pathNumber) continue;
    numbers.add(pathNumber);
  }
  for (const link of links) {
    if (
      extractTrackerLocalReportPaths(`[${link.label}](${link.target})`).length >
        0 &&
      /^\d+$/.test(link.label.trim())
    ) {
      numbers.add(Number.parseInt(link.label.trim(), 10));
    }
  }
  return [...numbers];
}

export function normalizeVia(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}
