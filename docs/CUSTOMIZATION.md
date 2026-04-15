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
| CV content               | `cv.md`                        | Summary, experience, projects, education, skills                                                            |
| Proof points             | `article-digest.md`            | Public metrics, portfolio evidence, proof-point wording that should override weaker CV phrasing             |
| Job-search targeting     | `portals.yml`                  | Positive and negative title filters, search queries, tracked companies                                      |
| Interview story bank     | `interview-prep/story-bank.md` | Accumulated STAR-style stories and interview examples                                                       |

### Common User-Layer Changes

- Add or adjust identity, role targets, or salary policy in `config/profile.yml`
- Update archetypes, negotiation language, or search narrative in
  `modes/_profile.md`
- Refresh resume bullets in `cv.md`
- Add stronger proof points in `article-digest.md`
- Tune `title_filter.positive`, `title_filter.negative`, `search_queries`, or
  `tracked_companies` in `portals.yml`

If you are setting up from scratch, start from
`config/profile.example.yml` and `templates/portals.example.yml`, then save
your final settings in the root user-layer files above.

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
  underlying CV content in `cv.md` and changing the template only when the
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
- `portals.yml`

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
