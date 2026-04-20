# Customization Guide

`jobhunt` has two kinds of files:

- **User layer**: your personal data, targeting, narrative, and outputs
- **System layer**: shared prompts, scripts, templates, and docs that define
  repo-wide behavior

Before customizing anything, read [AGENTS.md](../AGENTS.md) and
[DATA_CONTRACT.md](DATA_CONTRACT.md). The rule is simple: keep personal
content in user-layer files and keep shared defaults generic.

## Personalize These Files

Use the user layer for anything specific to you, your search, or your
negotiation posture.

| Goal                     | File                           | What belongs there                                                                                          |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Identity and constraints | `config/profile.yml`           | Name, email, location, timezone, target roles, compensation targets, work authorization, search constraints |
| Archetypes and narrative | `modes/_profile.md`            | Role archetypes, adaptive framing, negotiation scripts, location policy, scoring preferences                |
| CV content               | `profile/cv.md`                | Summary, experience, projects, education, skills                                                            |
| Proof points             | `profile/article-digest.md`    | Public metrics, portfolio evidence, proof-point wording that should override weaker CV phrasing             |
| Job-search targeting     | `config/portals.yml`           | Positive and negative title filters, tracked companies, and optional manual search notes                    |
| Interview story bank     | `interview-prep/story-bank.md` | Accumulated STAR-style stories and interview examples                                                       |

### Common User-Layer Changes

- Add or adjust identity, role targets, or salary policy in `config/profile.yml`
- Add or adjust scan-time geography constraints in `config/profile.yml ->
discovery`
- Update archetypes, negotiation language, or search narrative in
  `modes/_profile.md`
- Refresh resume bullets in `profile/cv.md`
- Add stronger proof points in `profile/article-digest.md`
- Tune `title_filter.positive`, `title_filter.negative`, and
  `tracked_companies` in `config/portals.yml`
- Keep `search_queries` in `config/portals.yml` only as manual notes for now; the
  current zero-token scanner does not execute them

If you are setting up from scratch, start from
`config/profile.example.yml`, `config/portals.example.yml`,
`profile/cv.example.md`, and optionally `profile/article-digest.example.md`,
then save your final settings in the user-layer files above.

## Current Scan Knobs That Actually Matter

For `npm run scan`, the current zero-token scanner uses:

- `tracked_companies`
- `title_filter.positive`
- `title_filter.negative`
- `config/profile.yml -> discovery` for scan-time location constraints

The following config concepts may still appear in some files, but they are not
active in the current scanner:

- `search_queries`
- `title_filter.seniority_boost`
- `tracked_companies.scan_method`
- `tracked_companies.scan_query`

## Retuning Loop

Use this loop when scan results are too broad or too thin:

1. Tighten or broaden `title_filter.positive` and `title_filter.negative` in
   `config/portals.yml`.
2. Adjust `config/profile.yml -> discovery` if the problem is geographic rather
   than title-based.
3. Preview with `npm run scan -- --compare-clean` so you see the config's real
   effect without old dedup state hiding results.
4. Narrow to one company with `npm run scan -- --company "Name" --compare-clean`
   when you need to debug a specific board.
5. Once the preview looks right, run `npm run scan` normally to save only the
   newly discovered roles.

## Shared Defaults

These files are update-safe system files. Change them only when you intend to
change behavior for every user of the repo.

| Shared surface                           | Purpose                                                        | When to edit                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `modes/_shared.md`                       | Shared scoring rules, workflow constraints, and global prompts | Only when changing repo-wide defaults. Do not place personal negotiation, targeting, or proof points here. |
| `templates/cv-template.html`             | Shared ATS PDF layout and styling                              | Only when changing the default template for all generated PDFs                                             |
| `templates/states.yml`                   | Canonical tracker statuses                                     | Only when intentionally changing the shared status model                                                   |
| `scripts/normalize-statuses.mjs`         | Status alias normalization                                     | Update alongside `templates/states.yml` if shared statuses change                                          |
| `docs/*`, `AGENTS.md`, `.codex/skills/*` | Runtime contract and contributor guidance                      | Edit only when the shared docs or checked-in instructions need correction                                  |

### Shared Template Notes

- `templates/cv-template.html` owns the default HTML and CSS for generated
  PDFs. If you want a one-off PDF variant for yourself, prefer keeping the
  underlying CV content in `profile/cv.md` and changing the template only when the
  repo default should change.
- `templates/states.yml` is not a personalization file. If you add or rename
  a shared tracker state, also update `scripts/normalize-statuses.mjs` and any
  checked-in docs that name those states.

## Live Runtime Surfaces

The active, checked-in runtime surface for this repo is:

- `AGENTS.md` for startup rules, routing, tracker integrity, and operating
  boundaries
- `.codex/skills/career-ops/SKILL.md` for the repo skill bootstrap and mode
  routing summary
- `scripts/*.mjs`, `npm run doctor`, and `node scripts/test-all.mjs --quick`
  for validation and maintenance

Do not depend on inactive hook files or local runtime aliases that are not
part of the checked-in contract.

## Quick Examples

### Change your target roles

Edit:

- `config/profile.yml`
- `modes/_profile.md`
- `config/portals.yml`

### Change your negotiation posture

Edit:

- `modes/_profile.md`

Do not store personal negotiation scripts in `modes/_shared.md`.

### Change the shared PDF look

Edit:

- `templates/cv-template.html`

This is a shared system change, not a personal data change.

### Change shared tracker states

Edit:

- `templates/states.yml`
- `scripts/normalize-statuses.mjs`

Do this only when you are intentionally changing the repo-wide tracker model.

## Avoid Drift

- Keep personal archetypes, negotiation language, proof points, and company
  targeting in the user layer
- Keep `modes/_shared.md` generic and reusable
- Treat `docs/*`, `AGENTS.md`, and `.codex/skills/*` as shared contract
  surfaces
- Validate shared changes with `node scripts/test-all.mjs --quick`
