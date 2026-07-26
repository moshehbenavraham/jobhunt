# Data Contract

This document defines which files belong to the **system** (auto-updatable) and which belong to the **user** (never touched by updates).

## User Layer (NEVER auto-updated)

These files contain your personal data, customizations, and work product. Updates will NEVER modify them.

| File                            | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `profile/cv.md`                 | Your CV in markdown                                  |
| `profile/article-digest.md`     | Your proof points from portfolio                     |
| `config/profile.yml`            | Your identity, targets, comp range                   |
| `config/cv-facts.json`          | Verified fact exceptions and forbidden phrases       |
| `config/benchmarks.yml`         | Your sourced directional funnel benchmarks           |
| `modes/_profile.md`             | Your archetypes, narrative, negotiation scripts      |
| `interview-prep/story-bank.md`  | Your accumulated STAR+R stories                      |
| `interview-prep/*.md`           | Saved company- or role-specific interview prep       |
| `interview-prep/sessions/*`     | Private practice/debrief transcripts and snapshots   |
| `interview-prep/offers/*`       | Private derived offer-review artifacts               |
| `offers/*`                      | Original sensitive offer documents and text          |
| `config/portals.yml`            | Your customized company list                         |
| `data/applications.md`          | Your application tracker                             |
| `data/pipeline.md`              | Your URL inbox                                       |
| `data/scan-history.tsv`         | Your scan history                                    |
| `data/portal-health.tsv`        | Append-only provider health observations             |
| `data/scan-runs.tsv`            | Append-only scan coverage and outcome ledger         |
| `data/follow-ups.md`            | Your follow-up history                               |
| `data/status-log.tsv`           | Append-only application status transition audit      |
| `data/agent-inbox.jsonl`        | Append-only inbound review queue and outcomes        |
| `data/salary-observations.tsv`  | Append-only original-currency compensation facts     |
| `data/assessments.tsv`          | Append-only assessment outcomes and staleness        |
| `data/openai-account-auth.json` | Your stored OpenAI account credentials               |
| `.jobhunt-app/*`                | Local app database, logs, backups, and runtime state |
| `reports/*`                     | Your evaluation reports                              |
| `output/*`                      | Your generated CV/letter artifacts and manifests     |
| `jds/*`                         | Your saved job descriptions                          |

## System Layer (safe to auto-update)

These files contain system logic, scripts, templates, and instructions that improve with each release.

| File                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `modes/_shared.md`                           | Scoring system, global rules, tools          |
| `modes/oferta.md`                            | Evaluation mode instructions                 |
| `modes/pdf.md`                               | PDF generation instructions                  |
| `modes/cover-letter.md`                      | Cover-letter generation instructions         |
| `modes/scan.md`                              | Portal scanner instructions                  |
| `modes/batch.md`                             | Batch processing instructions                |
| `modes/apply.md`                             | Application assistant instructions           |
| `modes/auto-pipeline.md`                     | Auto-pipeline instructions                   |
| `modes/contacto.md`                          | LinkedIn outreach instructions               |
| `modes/deep.md`                              | Research prompt instructions                 |
| `modes/ofertas.md`                           | Comparison instructions                      |
| `modes/pipeline.md`                          | Pipeline processing instructions             |
| `modes/project.md`                           | Project evaluation instructions              |
| `modes/tracker.md`                           | Tracker instructions                         |
| `modes/training.md`                          | Training evaluation instructions             |
| `modes/patterns.md`                          | Pattern analysis instructions                |
| `modes/followup.md`                          | Follow-up cadence instructions               |
| `modes/interview/*`                          | Interview plan/practice/debrief instructions |
| `modes/interview-redflag.md`                 | Interview risk-review instructions           |
| `modes/offer-prep.md`                        | Offer preparation instructions               |
| `modes/upskill.md`                           | Skill-gap aggregation instructions           |
| `modes/analytics.md`                         | Funnel and channel analytics rules           |
| `docs/LOCALIZATION.md`                       | Canonical EN/DE/FR/JA localization contract  |
| `AGENTS.md`                                  | Codex instructions                           |
| `scripts/*`                                  | Utility scripts and shell helpers            |
| `batch/batch-prompt.md`                      | Batch worker prompt                          |
| `batch/batch-runner.sh`                      | Batch orchestrator                           |
| `evals/*`                                    | Synthetic golden evaluation fixtures         |
| `apps/*`                                     | React operator app and local TypeScript API  |
| `dashboard/*`                                | Go TUI dashboard                             |
| `config/cv-facts.example.json`               | CV fact-policy scaffold                      |
| `data/follow-ups.example.md`                 | Optional follow-up history scaffold          |
| `data/openai-account-auth.example.json`      | OpenAI auth credential example               |
| `data/openai-account-auth.example.json.lock` | OpenAI auth lock example                     |
| `interview-prep/story-bank.example.md`       | Optional story bank scaffold                 |
| `profile/article-digest.example.md`          | Optional proof-point scaffold                |
| `profile/cv.example.md`                      | Starter CV template                          |
| `templates/*`                                | Base templates                               |
| `fonts/*`                                    | Self-hosted fonts                            |
| `.codex/skills/*`                            | Skill definitions                            |
| `docs/*`                                     | Documentation                                |
| `VERSION`                                    | Current version number                       |
| `tsconfig.base.json`                         | Shared TypeScript compiler contract          |
| `Dockerfile`                                 | Pinned reproducible container image          |
| `docker-compose.yml`                         | Local workspace and smoke services           |
| `.dockerignore`                              | User-data-safe image build context           |
| `docs/DATA_CONTRACT.md`                      | This file                                    |

## The Rule

**If a file is in the User Layer, no update process may read, modify, or delete it.**

**If a file is in the System Layer, it can be safely replaced with the latest version from the upstream repo.**

Legacy note: root-level `cv.md` and `article-digest.md` are still treated as
user data if they exist from an older checkout, but the canonical paths are now
`profile/cv.md` and `profile/article-digest.md`.

## Commit-time safety audit

Run `npm run safety:audit` before committing. The same audit blocks pull
requests when Git-tracked paths contain user-layer/generated artifacts, likely
resumes, transcripts, offer letters, credential files, high-confidence secret
formats, or non-example identity fields. It scans tracked files only, keeps
local ignored user data out of scope, and reports secret locations without
printing secret values.
