# Scripts Reference

Most script surfaces live in the project root as `.mjs` modules and are
exposed via `npm run <name>`. Repo-local shell helpers such as
`./scripts/ux.sh` also live under `scripts/`.

## Quick Reference

| Command                         | Script                                   | Purpose                                      |
| ------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `npm run cron:install`          | `scripts/install-scan-cron.mjs`          | Install repo-managed daily scan cron         |
| `npm run doctor`                | `scripts/doctor.mjs`                     | Validate setup prerequisites                 |
| `npm run auth:openai`           | `scripts/openai-account-auth.mjs`        | Manage stored OpenAI account auth            |
| `npm run lint:shell`            | `shellcheck`                             | Lint repo shell scripts                      |
| `npm run verify`                | `scripts/verify-pipeline.mjs`            | Check pipeline data integrity                |
| `npm run format:shell`          | `shfmt`                                  | Format repo shell scripts                    |
| `npm run normalize`             | `scripts/normalize-statuses.mjs`         | Fix non-canonical statuses                   |
| `npm run dedup`                 | `scripts/dedup-tracker.mjs`              | Remove duplicate tracker entries             |
| `npm run merge`                 | `scripts/merge-tracker.mjs`              | Merge batch TSVs into applications.md        |
| `npm run status`                | `scripts/set-status.mjs`                 | Change and audit one tracker status          |
| `npm run tracker:test`          | `scripts/test-tracker-core.mjs`          | Test tracker parsing, locks, and transitions |
| `npm run report:reserve`        | `scripts/reserve-report-ids.mjs`         | Atomically reserve report IDs                |
| `npm run reconcile`             | `scripts/reconcile-pipeline.mjs`         | Proof-gate pipeline inbox completion         |
| `npm run evaluation:policy`     | `scripts/evaluation-policy.mjs`          | Resolve spend, language, and market policy   |
| `npm run evaluation:validate`   | `scripts/evaluation-summary.mjs`         | Validate machine/risk report contracts       |
| `npm run model:evaluate`        | `scripts/model-provider-runner.mjs`      | Guarded Gemini/Ollama/OpenRouter draft       |
| `npm run model:runner:test`     | `scripts/test-model-provider-runner.mjs` | Test provider safety and report parity       |
| `npm run locales:test`          | `scripts/test-locale-parity.mjs`         | Verify canonical EN/DE/FR/JA mode parity     |
| `npm run container:test`        | `scripts/test-container-contract.mjs`    | Verify pinned image and smoke contract       |
| `npm run container:smoke`       | `scripts/container-smoke.sh`             | Run doctor/scan/PDF checks in the image      |
| `npm run evidence:reliability`  | `scripts/evidence-reliability.mjs`       | Classify company/comp evidence provenance    |
| `npm run eval:golden`           | `scripts/eval-golden.mjs`                | Replay deterministic evaluation regressions  |
| `npm run tokens:report`         | `scripts/token-usage.mjs`                | Aggregate measured batch token usage         |
| `npm run cv:build`              | `scripts/build-cv.mjs`                   | Build and validate a tailored CV PDF         |
| `npm run cover-letter`          | `scripts/build-cover-letter.mjs`         | Build an evidence-backed letter draft        |
| `npm run cover-letter:validate` | `scripts/validate-cover-letter.mjs`      | Validate letter artifacts and freshness      |
| `npm run cover-letter:test`     | `scripts/test-cover-letter.mjs`          | Run cover-letter pipeline regressions        |
| `npm run pdf`                   | `scripts/generate-pdf.mjs`               | Low-level validated HTML-to-PDF renderer     |
| `npm run pdf:validate`          | `scripts/validate-pdf.mjs`               | Validate a finished PDF and its manifest     |
| `npm run pdf:test`              | `scripts/test-pdf-pipeline.mjs`          | Run PDF integration and visual regressions   |
| `npm run latex`                 | `scripts/generate-latex.mjs`             | Validate and compile an optional LaTeX CV    |
| `npm run dashboard`             | `scripts/ux.sh`                          | Build and launch the Go dashboard            |
| `npm run sync-check`            | `scripts/cv-sync-check.mjs`              | Validate CV/profile consistency              |
| `npm run coverage`              | `c8` + `go test -cover`                  | Measure Node script and dashboard coverage   |
| `npm run update:check`          | `scripts/update-system.mjs check`        | Check for upstream updates                   |
| `npm run update`                | `scripts/update-system.mjs apply`        | Apply upstream update                        |
| `npm run rollback`              | `scripts/update-system.mjs rollback`     | Rollback last update                         |
| `npm run liveness`              | `scripts/check-liveness.mjs`             | Test if job URLs are still active            |
| `npm run network:test`          | `scripts/test-network-policy.mjs`        | Test shared SSRF, DNS, and redirect policy   |
| `npm run path:test`             | `scripts/test-path-policy.mjs`           | Test output path and symlink containment     |
| `npm run providers:test`        | `scripts/test-providers.mjs`             | Test provider registry and normalized feeds  |
| `npm run scan:policy:test`      | `scripts/test-scan-policy.mjs`           | Test rich scan filters and unknown policies  |
| `npm run scan:ledger:test`      | `scripts/test-scan-ledger.mjs`           | Test scan-run and portal-health ledgers      |
| `npm run fingerprint:test`      | `scripts/test-fingerprint-core.mjs`      | Test canonical URL and JD fingerprints       |
| `npm run reposts`               | `scripts/detect-reposts.mjs`             | Classify relists and material changes        |
| `npm run reposts:test`          | `scripts/test-detect-reposts.mjs`        | Test persisted repost/cross-list detection   |
| `npm run browser:extract:test`  | `scripts/test-browser-extract.mjs`       | Test guarded browser board fallback          |
| `npm run liveness:api:test`     | `scripts/test-liveness-api.mjs`          | Test API-first liveness decisions            |
| `npm run portals:validate`      | `scripts/validate-portals.mjs`           | Validate portal config without mutation      |
| `npm run portals:verify`        | `scripts/verify-portals.mjs`             | Probe enabled portals without mutation       |
| `npm run portals:test`          | `scripts/test-portals-config.mjs`        | Test validation and bounded verification     |
| `npm run scan:ats-full`         | `scripts/scan-ats-full.mjs`              | Scan explicit ATS/portfolio seed sets        |
| `npm run scan:ats-full:test`    | `scripts/test-scan-ats-full.mjs`         | Test bounded seed discovery and dedup        |
| `npm run extract-job`           | `scripts/extract-job.mjs`                | Extract one ATS-backed job as JSON           |
| `npm run scan`                  | `scripts/scan.mjs`                       | Zero-token portal scanner                    |
| `npm run codex:smoke`           | `scripts/openai-codex-smoke.mjs`         | Test the account-authenticated Codex path    |
| `npm run agents:codex:smoke`    | `scripts/openai-agents-codex-smoke.mjs`  | Test the `@openai/agents` account-auth path  |
| `./scripts/ux.sh`               | `scripts/ux.sh`                          | Direct shell entry point for the dashboard   |

---

## Evaluation contracts

`scripts/evaluation-policy.mjs` resolves three independent controls from
`config/profile.yml`:

- `spend_tier`: economy/standard/premium -> low/medium/high reasoning effort
- `language.output`: human-facing report language
- `market.ruleset`: compensation, benefit, classification, location, and
  terminology heuristics

`scripts/evaluation-summary.mjs` validates the versioned `## Machine Summary`,
the report header, and the fixed-order `## Risk Summary`. Risks use typed
`clear`, `flagged`, or `not_evaluated` states and must carry source attribution
when evaluated. Company and compensation evidence use provenance tiers:
`first_party`, `reliable_third_party`, `inferred`, or `unknown`.

```bash
npm run evaluation:policy
npm run evaluation:validate -- reports/042-example-2026-07-26.md
npm run evidence:reliability -- /tmp/evidence.json
npm run eval:golden
```

The golden command replays synthetic checked-in cases and fixtures without
network access or model spend. It gates archetype, score tolerance,
decision/legitimacy, and normalized risks.

`scripts/model-provider-runner.mjs` gives optional Gemini, local Ollama, and
OpenRouter models one shared read-only evaluation adapter. It requires an
explicit model ID, accepts JD files only from `jds/`, applies bounded requests
and responses, rejects non-loopback Ollama endpoints, redacts credentials from
failures, and validates the canonical report before returning or saving it.
An optional save is confined to `reports/` and transactionally publishes a
measured-usage manifest with explicit no-tracker/no-PDF/no-send/no-submit
invariants. Run `npm run model:evaluate -- --help` for arguments.

`scripts/token-usage.mjs` reads Codex JSONL events after a batch worker exits.
It stores a versioned `batch/logs/*.usage.json` sidecar with runner-measured
worker totals plus explicit zero-token local steps. Cost remains null because
mutable provider prices are not hardcoded.

---

## cron:install

Installs or refreshes the checked-in daily scan cron entry in the current
user's crontab. The active cron line calls the repo-owned
`scripts/run-scheduled-scan.sh` runner, which writes logs to
`tmp/cron/scan.log`.

```bash
npm run cron:install
npm run cron:install -- --hour 6 --minute 0
npm run cron:install -- --remove
```

Notes:

- default schedule is `06:00` host local time
- intended host timezone is `Asia/Jerusalem` when you want Israel-local runs
- the installer replaces only the tagged `jobhunt daily scan` block and leaves
  other cron entries untouched

**Exit codes:** `0` success, `1` invalid arguments or crontab failure.

---

## doctor

Validates that all prerequisites are in place: Node.js >= 20, dependencies
installed, Playwright chromium, required files (`profile/cv.md`,
`config/profile.yml`, `config/portals.yml`), fonts directory, and auto-creates
`data/`, `output/`, `reports/` if missing. It also reports whether stored
OpenAI account auth is ready, missing, expired, or needs repair, along with the
next repo command to run.

```bash
npm run doctor
```

**Exit codes:** `0` all checks passed, `1` one or more checks failed (fix messages printed).

---

## auth:openai

Manages the stored OpenAI account auth state used by the repo-owned Codex and
Agents runtime paths.

```bash
npm run auth:openai -- login
npm run auth:openai -- status
npm run auth:openai -- refresh
npm run auth:openai -- reauth
npm run auth:openai -- logout
```

Notes:

- stored credentials live in `data/openai-account-auth.json` by default
- `reauth` replaces the current stored credentials with a fresh login
- `status` prints the auth file path plus the next recommended command
- `print-access-token` exists for debugging only and should stay out of normal workflows

**Exit codes:** `0` success, `1` command failure or missing auth state for
commands that require stored credentials.

---

## codex:smoke

Validates the raw account-authenticated Codex transport against the configured
OpenAI account state.

```bash
npm run codex:smoke -- --json
```

If auth is missing or invalid, the command exits non-zero and prints the exact
recovery command to run next.

**Exit codes:** `0` success, `1` transport or auth failure.

---

## agents:codex:smoke

Validates the repo-owned `@openai/agents` provider path through the stored
OpenAI account auth state.

```bash
npm run agents:codex:smoke -- --json
npm run agents:codex:smoke -- --json --stream
```

If auth is missing or invalid, the command exits non-zero and prints the exact
recovery command to run next.

**Exit codes:** `0` success, `1` provider, transport, or auth failure.

---

## lint:shell

Runs `shellcheck` against the repo-owned shell scripts:

- `batch/batch-runner.sh`
- `batch/test-fixtures/mock-codex-exec.sh`
- `scripts/analyze-project.sh`
- `scripts/run-scheduled-scan.sh`
- `scripts/ux.sh`

```bash
npm run lint:shell
```

Notes:

- requires `shellcheck` on `PATH`
- `npm run lint` includes this check together with `biome lint scripts`

**Exit codes:** `0` no shell lint findings, `1` one or more findings or missing tool.

---

## format:shell

Formats the repo-owned shell scripts with `shfmt` using the checked-in style:

- indent size `2`
- switch-case indentation enabled
- simplified redirections where possible

```bash
npm run format:shell
npm run format:shell:check
```

Notes:

- requires `shfmt` on `PATH`
- `format:shell` writes changes in place
- `format:shell:check` prints diffs and exits non-zero if formatting is needed
- `npm run format` and `npm run format:check` now include the shell formatting pass

**Exit codes:** `0` success or already formatted, `1` formatting drift or missing tool.

---

## verify

Health check for pipeline data integrity. It uses the shared header-aware
tracker parser and validates canonical statuses, unique tracker numbers,
company+role duplicates, contained report links, score and row formats, pending
TSVs, and manifest-backed PDF freshness.

```bash
npm run verify
```

**Exit codes:** `0` pipeline clean (zero errors), `1` errors found. Warnings (e.g. possible duplicates) do not cause a non-zero exit.

---

## normalize

Maps non-canonical statuses to their canonical equivalents and strips markdown bold and dates from the status column. Aliases like `Enviada` become `Aplicado`, `CERRADA` becomes `Descartado`, etc. DUPLICADO info is moved to the notes column.

```bash
npm run normalize             # apply changes
npm run normalize -- --dry-run  # preview without writing
```

Creates a `.bak` backup of `applications.md` before writing.

**Exit codes:** `0` always (changes or no changes).

---

## dedup

Removes duplicate entries from `applications.md` by grouping on normalized company name + fuzzy role match. Keeps the entry with the highest score. If a removed entry had a more advanced pipeline status, that status is promoted to the keeper.

```bash
npm run dedup             # apply changes
npm run dedup -- --dry-run  # preview without writing
```

Creates a `.bak` backup before writing.

**Exit codes:** `0` always.

---

## merge

Merges batch tracker additions (`batch/tracker-additions/*.tsv`) into `applications.md`. Handles 9-column TSV, 8-column TSV, and pipe-delimited markdown formats. Detects duplicates by report number, entry number, and company+role fuzzy match. Higher-scored re-evaluations update existing entries in place.

```bash
npm run merge                 # apply merge
npm run merge -- --dry-run    # preview without writing
npm run merge -- --verify     # merge then run verify-pipeline
```

Successfully merged or confirmed-duplicate TSVs are moved to
`batch/tracker-additions/merged/`. Malformed additions and number/report
identity conflicts remain pending for review. The tracker is read and replaced
under the same path-derived lock used by all other writers.

**Exit codes:** `0` success, `1` verification errors (with `--verify`).

---

## status

Changes one existing row by tracker number, report number, or unambiguous
company identity. The command validates `templates/states.yml`, serializes the
read-modify-write, publishes atomically, and appends the transition to the
user-owned `data/status-log.tsv`.

```bash
npm run status -- '#42' Interview
npm run status -- report:42 Hired --note "Offer accepted"
npm run status -- Acme Applied --role "Platform Engineer" --dry-run
```

The Go dashboard uses the same lock, canonical-state contract, transition
journal, and audit log. Interrupted cross-file updates are recovered on the
next locked transition.

---

## report:reserve

Reserves one or more contiguous report IDs across existing reports, tracker
rows and links, pending tracker TSVs, batch state, and concurrent evaluators.
Reservations live in `reports/.reservations/` rather than masquerading as
reports.

```bash
npm run report:reserve
npm run report:reserve -- --count 8
npm run report:reserve -- --release 1042-1049
npm run report:reserve -- --gc
```

IDs are padded to a minimum of three digits, with no ceiling at `999`. Release
requires ownership through the library API; the explicit CLI release is the
administrative cleanup path. Garbage collection skips live owners and removes
dead stale claims or claims already backed by durable artifacts.

---

## Application lifecycle and communication

The application helpers are deliberately split into inspect, prepare, review,
and record steps. None exposes a form-submit or message-send action.

Inspect a captured ATS form and build a typed, prepare-only plan:

```bash
npm run application:preflight -- --snapshot=tmp/form.json \
  --expected-company=Acme --expected-role="Platform Engineer" \
  --pdf=output/cv-acme.pdf
```

The preflight identifies Greenhouse, Ashby, Lever, Workday, or a generic form;
classifies identity, knockout, consent, and attachment fields; validates the
selected PDF's fresh sibling manifest; checks company/role drift and
repeat-company history; and leaves every consent field for the candidate.

After human review, persist exact field values and provenance alongside the
evaluation report:

```bash
npm run application:answers -- \
  --report=reports/042-acme.md --input=tmp/answers.json
```

This writes a versioned JSON sidecar plus an idempotent Markdown section.
`submitted_by_user` is accepted only as an explicit candidate-confirmed state;
the tool itself always records `submissionPerformedByTool: false`.

Draft a formal HR, recruiter, referral, cold, no-show, or ATS-failure email:

```bash
npm run application:email -- --input=tmp/email-draft.json
```

Drafts use exact evidence excerpts from declared profile/JD sources, validate
any attached PDF manifest, live under `reports/`, and always require human
review. There is no send command.

Classify and match a pasted employer reply or interview invite without changing
the tracker:

```bash
npm run inbound:match -- --input=tmp/inbound-message.json
```

The result includes category, recommended canonical transition, ranked tracker
candidates, confidence, and conflicts. Ambiguous same-company roles remain
review-only.

An actual transition to `Applied` through `npm run status` automatically seeds
the next follow-up. Manual and exception variants are also available:

```bash
npm run followup:seed -- 42 --variant=ats_failure --days=2
npm run followup:seed -- 42 --variant=no_show --date=2026-07-26
```

Schedule pins are append-only notes under the tracker, not sent-message claims.
The cadence reader honors the most recent pin.

Safe tracker/config utilities:

```bash
npm run application:add -- --num=42 --date=2026-07-26 \
  --company=Acme --role="Platform Engineer" --score=4.3/5 \
  --report=reports/042-acme.md
npm run application:find -- "Platform Engineer"
npm run titles:expand
npm run titles:expand -- --accept="AI Platform Engineer" --apply
```

`application:add` writes only a pending tracker TSV and rejects fuzzy duplicate
company+role pairs. `application:find` is read-only. Title expansion previews
deterministic adjacent role families and changes only `config/portals.yml`
after explicit acceptance, with a backup.

The durable inbound queue uses an append-only JSONL event log with expiring
claims, explicit review, and recorded outcomes:

```bash
npm run agent:inbox -- enqueue --source-type=paste --summary="Reply to review"
npm run agent:inbox -- claim --id=<item-id>
npm run agent:inbox -- review --id=<item-id> --token=<claim-token> \
  --decision=approve
npm run agent:inbox -- outcome --id=<item-id> --token=<claim-token> \
  --status=completed
```

An approved item still requires an unexpired claim for its outcome. Every queue
event preserves the no-send/no-submit invariant.

---

## Interview, offer, and analytics tools

### interview:session

Validates and persists a versioned `plan`, `practice`, or `debrief` session:

```bash
npm run interview:session -- --input=tmp/interview-plan.json
npm run interview:session -- --input=tmp/interview-practice.json
npm run interview:session -- --input=tmp/interview-debrief.json
```

Paired Markdown/JSON artifacts live in ignored
`interview-prep/sessions/`. Plans retain sourced gaps and time blocks; practice
snapshots retain exact answers, competencies, feedback, and claim review;
debriefs verify every cited excerpt against the local transcript and hash it.
All three support structured panel intelligence and five-dimensional
process/culture/management/scope/compensation signals with candidate review
state. Story candidates are never appended automatically:

```bash
npm run interview:session -- --input=tmp/debrief.json \
  --accept-story-updates
```

That explicit flag appends idempotent STAR+R sections under a lock. The command
records `realTimeInterviewAssistance: false`.

### offer:prep

Original offer documents and extracted-text companions remain under ignored
`offers/`. Build a review artifact from exact source excerpts:

```bash
npm run offer:prep -- --input=tmp/offer-prep.json
```

The tool hashes but does not copy the source documents, validates each term/risk
excerpt, and writes a paired draft/snapshot under
`interview-prep/offers/`. Human review is required; send and offer acceptance
are hard-coded false. This is not legal or tax advice.

### salary:observations and assessments

Compensation facts are append-only and retain original currency and period:

```bash
npm run salary:observations -- add --input=tmp/salary-observation.json
npm run salary:observations -- --summary
```

The ledger distinguishes desired, advertised, actual, and per-round stated
amounts. Stated values require round/interviewer context. Gap math runs only
when currency and period already match; no conversion occurs.

Assessment outcomes use the same locked append-only design:

```bash
npm run assessments -- add --input=tmp/assessment.json
npm run assessments -- --summary --today=2026-07-26
```

Each row retains evaluation date, tracker identity, platform, skill, explicit
outcome, source, optional `staleAfter`, and note. Missing `staleAfter` means
unknown freshness, never “current”; malformed rows stay visible in data-quality
output.

### upskill

Aggregate exact requirements from valid Machine Summaries and structured JD
skill-gap sidecars:

```bash
npm run upskill -- --json
npm run upskill
```

Or analyze one local JD against the canonical CV:

```bash
npm run upskill -- --jd=jds/target.md --cv=profile/cv.md
```

The tool writes user-owned paired artifacts under `reports/upskill/`, preserves
report/posting sources, reports invalid inputs, performs no semantic expansion,
and never adds a CV claim.

### analytics

Compute cumulative funnel, observed stage velocity, ATS-channel yield, and
direct/agency intermediary yield:

```bash
npm run analytics
npm run analytics -- --summary
npm run analytics -- --benchmarks=config/benchmarks.yml
```

The parser is tracker-header-aware and combines snapshots with the current
10-column status ledger. A rejected/discarded snapshot proves only Applied;
intermediate stages require observed events. Rate claims require at least 20
applications, velocity percentiles at least three completions, and channel
claims at least five submissions. Censored rows and malformed events are
reported. All channel results state that they are observational, not causal.
The shipped broad ranges in `templates/benchmarks.yml` are illustrative;
candidate-specific sources belong in ignored `config/benchmarks.yml`.

---

## reconcile

Moves a pending `data/pipeline.md` URL to its processed section only when the
latest batch state is `completed`, `partial`, or `skipped`, exactly one report
file exists, and exactly one matching tracker row exists with compatible
company/role identity. Missing, ambiguous, failed, or mismatched outcomes stay
pending.

```bash
npm run reconcile -- --dry-run
npm run reconcile
```

The command locks both the tracker and pipeline before reading, preserves
concurrent inbox additions, writes atomically, and creates a user-owned backup.

---

## cv:build, pdf, and pdf:validate

`cv:build` is the default tailored-CV entry point. It validates a structured
JSON document with Zod, checks every evidence excerpt against its source file,
measures supported and unsupported JD requirements, renders semantic HTML
deterministically, and generates a tagged PDF with an outline.

```bash
npm run cv:build -- /tmp/cv-build-jane-acme.json \
  output/cv-jane-acme-2026-07-26.pdf --max-pages=2
```

The input contract is `templates/cv-build.schema.json`. A successful build
writes four sibling artifacts:

- `.pdf` -- the published CV
- `.cv-build.json` -- canonical structured content and evidence references
- `.html` -- exact final HTML used by Chromium
- `.manifest.json` -- JD/source/template/version hashes, PDF SHA-256,
  requirement coverage, page/format metadata, and validation results

`pdf` is the lower-level renderer for an already-prepared HTML document:

```bash
npm run pdf -- input.html output.pdf --format=letter --max-pages=2
npm run pdf -- input.html output.pdf --format=a4 --max-pages=2
```

It writes to a temporary partial file and publishes the output only if qpdf,
PDF.js, Poppler, font embedding/Unicode, identity, heading order, token
retention, tagging, outline, and DOM-overflow gates all pass.

Validate an existing build and its freshness with:

```bash
npm run pdf:validate -- output/cv-jane-acme-2026-07-26.pdf \
  --manifest=output/cv-jane-acme-2026-07-26.manifest.json
```

Useful validator options include `--pages`, `--max-pages`, `--format`,
`--require-tika`, `--json`, and `--quiet`.

Prerequisites:

- Playwright Chromium
- `qpdf`
- Poppler (`pdfinfo`, `pdftotext`, `pdffonts`)
- MuPDF (`mutool`) for visual regression snapshots
- optional locally, required in quality CI: Java and an Apache Tika app JAR
  exposed through `TIKA_APP_JAR`

Run `npm run doctor` to check the local toolchain. `npm run pdf:test` covers
Letter and A4, long URLs and company names, a missing phone, multilingual
labels, two-page pressure, stale manifests, parser agreement, and MuPDF visual
baselines. `scripts/test-generate-pdf-normalization.mjs` separately covers ATS
Unicode normalization.

**Exit codes:** `0` all required gates passed, `1` invalid input, stale
manifest, missing prerequisite, or failed PDF validation.

---

## cover-letter and cover-letter:validate

`cover-letter` builds a deterministic, evidence-backed draft from the contract
in `templates/cover-letter-build.schema.json`. Every non-closing paragraph
references exact evidence from the JD or a declared profile source, and numeric
claims must occur in those evidence excerpts.

```bash
npm run cover-letter -- tmp/cover-letter-build.json
npm run cover-letter -- tmp/cover-letter-build.json --pdf
```

The markdown draft is always generated. `--pdf` additionally produces a
tagged, outlined, one-page upload artifact. The default output name includes
candidate, company, role, and date. A successful build writes:

- `.md` -- editable draft and human-review marker
- `.html` -- deterministic rendered source
- `.cover-letter.json` -- canonical content and evidence references
- optional `.pdf` -- uploadable artifact
- `.manifest.json` -- source/template/version/artifact hashes, evidence status,
  form trigger, and required human-review state

Existing deterministic artifacts are protected by default. Use `--force` only
after preserving any human edits. Validate freshness with:

```bash
npm run cover-letter:validate -- output/{artifact}.manifest.json
```

Validation fails when the structured build, source files, JD, template,
Markdown, HTML, pipeline version, or optional PDF has changed. A letter remains
a draft even after validation; the candidate must review and approve it before
submission.

**Exit codes:** `0` generation or validation passed, `1` invalid evidence,
unsafe path, stale artifact, overwrite conflict, missing prerequisite, or PDF
validation failure.

---

## latex

Validates a `.tex` CV against the repo's LaTeX guardrails, then compiles it
with `pdflatex` when the local toolchain is available. This is the optional
LaTeX / Overleaf path; the default ATS-first flow remains `npm run cv:build`.

```bash
npm run latex -- input.tex output.pdf
npm run latex -- output/cv-jane-openai-2026-04-19.tex
```

Notes:

- requires `pdflatex` on `PATH`
- supported local distributions include TeX Live and MiKTeX
- if the output path is omitted, the PDF is written beside the input `.tex`
- validation failures exit with code `1`, print a JSON report, and skip
  compilation
- missing `pdflatex` returns a clear actionable error instead of silently
  failing; the same `.tex` can still be uploaded to Overleaf

**Exit codes:** `0` validation and compile succeeded, `1` invalid input or
compile failure.

The LaTeX validation regression is covered by `scripts/test-generate-latex.mjs`
and runs as part of `node scripts/test-all.mjs --quick`.

---

## sync-check

Validates that the jobhunt setup is internally consistent: `profile/cv.md` exists and is not too short, `config/profile.yml` exists with required fields, no hardcoded metrics in `modes/_shared.md` or `batch/batch-prompt.md`, and `profile/article-digest.md` freshness (warns if older than 30 days).

```bash
npm run sync-check
```

**Exit codes:** `0` no errors (warnings allowed), `1` errors found.

---

## coverage

Measures actual code coverage instead of only pass/fail health.

```bash
npm run coverage
```

This runs two coverage passes:

- `npm run coverage:node` wraps `node scripts/test-all.mjs --quick` with `c8`
  and writes reports to `coverage/node/`.
- `npm run coverage:dashboard` runs `go test ./... -covermode=atomic
-coverprofile=coverage.out` inside `dashboard/` and prints the summary from
  `go tool cover -func=coverage.out`.

Useful variants:

```bash
npm run coverage:node
npm run coverage:dashboard
npm run coverage:dashboard:html
```

`coverage:dashboard:html` writes `dashboard/coverage.html` after
`dashboard/coverage.out` already exists.

**Exit codes:** `0` both coverage runs succeeded, `1` either coverage run failed.

---

## ux.sh

Builds and launches the Go dashboard from the repo root without manually
changing into `dashboard/`. The canonical operator entry point is
`npm run dashboard`, which wraps this script.

```bash
npm run dashboard
npm run dashboard -- --help
./scripts/ux.sh
./scripts/ux.sh --help
./scripts/ux.sh --path /abs/path/to/another/jobhunt/clone
```

Notes:

- requires `go` on `PATH`
- builds `dashboard/career-dashboard`
- defaults `--path` to the current repo root when you do not provide one
- passes additional flags through to the dashboard binary

**Exit codes:** `0` dashboard exited cleanly, `1` missing Go, build failure, or
dashboard startup failure.

---

## update:check

Checks whether a newer version of jobhunt is available upstream. Outputs JSON to stdout:

```bash
npm run update:check
```

Possible JSON responses:

| `status`           | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `up-to-date`       | Local version matches remote                                   |
| `update-available` | Newer version exists (includes `local`, `remote`, `changelog`) |
| `dismissed`        | User dismissed the update prompt                               |
| `offline`          | Could not reach GitHub                                         |

**Exit codes:** `0` always.

---

## update

Applies the upstream update. Creates a backup branch
(`backup-pre-update-{version}`), fetches from the configured `origin`, checks
out only system-layer files, runs `npm install`, and commits. User-layer files
(`profile/cv.md`, `config/profile.yml`, `data/`, etc.) are never touched.

```bash
npm run update
```

The target revision may extend structural system paths, declare required
materialized paths, and request allowlisted migrations through
`scripts/update-manifest.json`. The updater validates every manifest path,
materializes the target updater's relative import closure before continuing,
prunes files removed from managed directories, and restores the pre-update
system state if validation or migration fails.

**Exit codes:** `0` success, `1` lock conflict, invalid target manifest,
incomplete target, migration failure, or safety violation.

---

## rollback

Restores system-layer files from the most recent backup branch created during
an update. Structural rollback also removes system files and nested directory
children that the newer version introduced.

```bash
npm run rollback
```

**Exit codes:** `0` success, `1` no backup branch found or git error.

---

## safety:audit

Audits Git-tracked files before they can leave the repository:

```bash
npm run safety:audit
```

The audit rejects user-layer/generated artifacts, likely resumes,
transcripts, offer letters, credentials, tracked symlinks, non-example
identity fields, and high-confidence secret formats. It reports only the
location and rule; matched secret values are redacted. Pull-request quality
and test workflows run the same command.

**Exit codes:** `0` clean, `1` findings, `2` audit/configuration error.

---

## extract-job

Extracts a single job posting directly from a supported ATS URL and prints a
normalized JSON payload. This is the repo-owned single-job counterpart to the
scanner's ATS fetch logic.

Supported hosted ATS URL families:

- `jobs.ashbyhq.com`
- `boards.greenhouse.io`
- `job-boards.greenhouse.io`
- `job-boards.eu.greenhouse.io`
- `jobs.lever.co`

```bash
npm run extract-job -- https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb
npm run extract-job -- https://job-boards.greenhouse.io/figma/jobs/5364702004
npm run extract-job -- https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63
```

Output fields include:

- ATS type and source URL
- normalized job URL and apply URL
- company slug plus best-effort company name
- title, location, department/team, employment type, workplace type
- published date
- normalized compensation object when the ATS exposes it
- JD HTML and plain-text content

Single-job extraction keeps its richer compensation/JD extraction in
`scripts/ats-core.mjs`. Portal scanning routes Greenhouse, Ashby, Lever, and
zero-key feeds through the normalized registry in `scripts/providers/`.

For supported Ashby, Greenhouse, and Lever job URLs, auto-pipeline uses this
helper first. If the helper does not support the URL or extraction fails, fall
back to Playwright, WebFetch, then WebSearch.

**Exit codes:** `0` success, `1` unsupported URL or extraction failure.

---

## liveness

Tests whether job posting URLs are still live using headless Chromium. Detects expired patterns (e.g. "job no longer available"), HTTP 404/410, ATS redirect patterns, and apply-button presence. Supports multi-language expired patterns (English, German, French).

```bash
npm run liveness -- https://example.com/job/123
npm run liveness -- https://a.com/job/1 https://b.com/job/2
npm run liveness -- --file urls.txt
```

Each URL gets a verdict: `active`, `expired`, or `uncertain` with a reason.

**Exit codes:** `0` all URLs active, `1` any expired or uncertain.

---

## scan

Zero-token portal scanner. Routes configured company boards and explicit
zero-key sources through `scripts/providers/`; applies title and profile
location filters; stores trust scores/flags in the pipeline and
`data/scan-history.tsv`; isolates provider failures; and refreshes the
shortlist ranking. Built-in providers include Greenhouse, Ashby, Lever,
Workday, SmartRecruiters, Workable, Recruitee, Teamtailor, BambooHR, Personio,
Pinpoint, Rippling, Remotive, RemoteOK, Arbeitnow, Himalayas, Jobicy, and The
Muse.

`scan_filters` supports company/title blacklists, seniority include/exclude,
description include/exclude, annual salary/currency thresholds, maximum
posting age, and visa-sponsorship signals. Salary is never silently converted
between currencies. Each incomplete field has an explicit
`unknown: allow|reject` policy.

```bash
npm run scan
npm run scan -- --compare-clean
```

**Exit codes:** `0` scan completed, `1` configuration error or no config/portals.yml found.

---

## scan-state

Developer-oriented maintenance command for `data/pipeline.md` and
`data/scan-history.tsv`. Use this when you intentionally want to archive or
reset scan artifacts during testing or when changing campaigns. Archives are
written to `tmp/scan-state/<timestamp>/`.

```bash
npm run scan-state -- --archive-pipeline
npm run scan-state -- --archive-history
npm run scan-state -- --archive-all
npm run scan-state -- --reset-pipeline
npm run scan-state -- --reset-history --yes
```

Recommended usage:

- normal retuning: prefer `npm run scan -- --compare-clean`
- inbox cleanup: `npm run scan-state -- --archive-pipeline`
- destructive history wipe: `npm run scan-state -- --reset-history --yes`

Notes:

- `--archive-*` recreates a fresh scaffold after moving the old file
- `--reset-history` requires `--yes`
- normal users should usually keep `data/scan-history.tsv` intact because it
  powers dedup and repost-pattern signals

**Exit codes:** `0` success, `1` invalid usage or refused destructive reset.
