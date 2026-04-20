# Workflow Checklist

This is the practical operator checklist for running the repo's default
job-application workflow from discovery through post-apply outreach.

## 1. Make Sure Your Base Files Are Solid

Tell your story in:

- `profile/cv.md`
- `config/profile.yml`
- `modes/_profile.md`

Optional extra proof:

- `profile/article-digest.md`

Tune discovery targets in:

- `config/portals.yml`

These files drive evaluation, PDF generation, draft answers, compensation
framing, work-authorization answers, and role targeting.

## 2. First Time: Run Discovery

```bash
npm run scan
```

This scans your configured portals, updates `data/pipeline.md`, and records job
history in `data/scan-history.tsv`.

## 3. Optional Daily Automation For Discovery

```bash
npm run cron:install
```

This installs the repo's daily scan job and refreshes discovery at `6am` Israel
time.

## 4. Repeatable Workflow Starts Here

Open `data/pipeline.md`.

Use this order:

1. Review `## Shortlist` first.
2. Then choose the single best unchecked role from `## Pending`.
3. Copy the job URL.

`## Shortlist` is the first place to look.
`## Pending` is the real queue.

## 5. Trigger Auto-Pipeline

Paste the bare job URL into Codex.

A bare ATS/JD URL is treated as an auto-pipeline trigger.

## 6. Codex Runs The Full Pipeline Automatically

On a normal run, Codex will:

- check repo update status silently
- verify required profile and setup files exist
- read:
  - `modes/_shared.md`
  - `modes/_profile.md`
  - `modes/auto-pipeline.md`
  - `config/profile.yml`
  - `profile/cv.md`
  - `profile/article-digest.md` if present
- run:
  - `node scripts/cv-sync-check.mjs`
  - `node scripts/extract-job.mjs <url>`
  - `npm run liveness -- <url>`
- extract the JD from the ATS helper when supported
- verify the posting is still live
- evaluate the role across Blocks `A-G`
- research compensation and company context
- generate a tailored ATS PDF
- save the full report
- write a tracker addition in `batch/tracker-additions/`
- merge the tracker addition into `data/applications.md`
- run `node scripts/verify-pipeline.mjs`

If the score is `>= 4.5`, auto-pipeline may also inspect the live application
form and prepare draft answers for the visible questions.

Typical outputs:

- report: `reports/<report>.md`
- PDF: `output/<pdf>.pdf`
- tracker row: `data/applications.md`
- score: `X.X/5`
- legitimacy: `High Confidence`, `Proceed with Caution`, or `Suspicious`

Example from the ElevenLabs run:

- report: `reports/002-elevenlabs-2026-04-19.md`
- PDF: `output/cv-max-gibson-elevenlabs-2026-04-19.pdf`
- tracker row: `data/applications.md`
- score: `4.5/5`
- legitimacy: `Proceed with Caution`

## 7. Review The Report And Apply Manually

Review the generated report.

If the role still clears your fit, comp, and risk bar:

- use the tailored PDF from `output/`
- use the draft answers from the report if present
- review and edit everything in your own voice
- submit the application yourself

Important:

- `jobhunt` helps prepare the application
- it does not submit the application on your behalf

## 8. Use Live Application Assistance When Needed

Use this prompt when you want field-by-field help on the live form:

```text
Open the application page and act as my live application copilot with browser assistance. Use report @<reports/file.md> and the tailored PDF at @<output/cv.pdf>. Read the visible form field by field, generate polished copy-paste-ready answers in my voice for each question, tell me what to upload/select/type, adapt if the live form differs from the report, continue as I scroll, and once I confirm submission update the tracker from Evaluated to Applied. Do not submit for me.
```

Short version that also works in the same session:

```text
Help me complete this application live with browser assistance. Use the saved report and PDF, answer the visible fields one by one, adapt to the live form, and update the tracker after I submit. Do not submit for me.
```

## 9. After Submission, Confirm It

When the application is submitted, enter:

```text
submitted
```

This updates the tracker row in `data/applications.md` from `Evaluated` to
`Applied`.

It does not update `data/pipeline.md`.

## 10. Run Outreach Via `modes/contacto.md`

Run the official outreach workflow after applying.

This gives you:

- who to contact
- which target to prioritize
- what LinkedIn connection note or outreach message to send

After you confirm you actually sent the outreach, Codex can record it in:

- `data/follow-ups.md`
- `data/applications.md`

Then verify the repo state:

```bash
node scripts/verify-pipeline.mjs
```

## 11. Wait, Then Repeat From Step 4

After the application and outreach are done:

- wait for replies, connection accepts, recruiter messages, or interview emails
- in the meantime, return to Step `4`
- keep adding strong applications to the queue

## 12. If A Response Arrives, Paste It Into Chat

If the company responds:

- paste the email, message, or screenshot into Codex
- Codex can help draft the reply, update status, and route into the next repo
  workflow

## Notes

- The default workflow is modular:
  - evaluation and PDF generation
  - live apply assistance
  - tracker update
  - outreach
  - follow-up cadence
- `modes/contacto.md` is the official LinkedIn outreach workflow.
- `modes/followup.md` is the official follow-up cadence workflow.
- `data/applications.md` is the application tracker.
- `data/follow-ups.md` records confirmed sent follow-ups and outreach touches.

---

## Capability Map Outside The Main 1-12 Checklist

This section is separate from the main checklist on purpose.

- The main `1-12` checklist is still the default path.
- The items below are side paths, alternate flows, or support workflows.
- The lettered numbers show where each feature fits relative to the main flow.

### Before Step 1

- `0A. Onboarding / first-time setup`
  Use when the repo is not ready yet and you need to create or clean up:
  `profile/cv.md`, `config/profile.yml`, `modes/_profile.md`, `config/portals.yml`,
  and `data/applications.md`.
- `0B. Setup validation`
  Run `npm run doctor` when you want a direct setup check instead of discovering
  problems during a workflow.
- `0C. System update check / apply / rollback`
  This happens silently at session start, but it is also a real platform
  capability:
  `node scripts/update-system.mjs check|apply|dismiss|rollback`.

### Around Step 1

- `1A. Personalization and targeting refinement`
  Use when you want to improve role targeting, comp policy, archetypes,
  narrative, or work-auth answers by editing:
  `config/profile.yml`, `modes/_profile.md`, `profile/article-digest.md`, or
  `config/portals.yml`.
- `1B. Customization reference`
  Use `docs/CUSTOMIZATION.md` when you want to change how the system behaves for
  you without changing shared defaults.

### Around Step 2

- `2A. Scan-only mode`
  Use `modes/scan.md` when you want discovery refresh without immediately
  moving into evaluation.
- `2B. Pipeline processing mode`
  Use `modes/pipeline.md` when you want Codex to process `data/pipeline.md` as a
  queue instead of manually reading the shortlist yourself.

### Around Step 4

- `4A. Batch evaluation`
  Use `modes/batch.md` when you want to evaluate multiple jobs in one pass
  instead of picking only one URL.
- `4B. Project / portfolio review`
  Use `modes/project.md` when you want to assess whether a project strengthens
  your candidacy before applying.
- `4C. Training / certification review`
  Use `modes/training.md` when you want to decide whether a training path or
  credential is worth doing for your target market.

### Instead Of Steps 5-6

- `5A. Evaluation only`
  Use `modes/oferta.md` when you want a score and judgment on one role without
  running the full apply pipeline.
- `5B. Compare offers or final options`
  Use `modes/ofertas.md` when you have multiple real options and want a direct
  side-by-side decision framework.

### Around Step 6

- `6A. PDF-only generation`
  Use `modes/pdf.md` when you already know the target role and only want a
  tailored ATS PDF.
- `6B. Deep company research`
  Use `modes/deep.md` when the company, market, leadership, finances, or role
  legitimacy needs more investigation before you apply.
- `6C. Tracker review`
  Use `modes/tracker.md` when you want status review, tracker cleanup, or a
  read on where things stand across your applications.

### After Step 10

- `10A. Follow-up cadence`
  Use `modes/followup.md` when you want to plan or draft post-application or
  post-outreach follow-ups instead of waiting passively.

### After Step 12

- `12A. Interview preparation`
  Use `modes/interview-prep.md` once a screen, interview loop, or technical
  conversation is scheduled.
- `12B. Rejection-pattern analysis`
  Use `modes/patterns.md` when enough outcomes have accumulated and you want to
  diagnose where the funnel is breaking.

### Cross-Cutting Support Capabilities

- `X1. Architecture and script reference`
  Use `docs/ARCHITECTURE.md`, `docs/SCRIPTS.md`, and `batch/README.md` when you
  need to understand repo mechanics rather than run the workflow.
- `X2. Data-boundary reference`
  Use `docs/DATA_CONTRACT.md` when deciding whether a change belongs in user
  data or system files.
- `X3. Policy and platform boundaries`
  Use `docs/LEGAL_DISCLAIMER.md` and `docs/THIRD_PARTY_CONNECTIONS.md` when you
  need the official rules around external systems, manual submission, and
  platform boundaries.

### Dashboard UX/UI Intersections

- `D0. Launch`
  Run the Go TUI from `dashboard/` when you want a visual operations layer over
  the same tracker and report artifacts.
- `2D. After discovery`
  The dashboard helps review campaign state after `npm run scan`, but
  `data/pipeline.md` is still the shortlist source for picking the next role.
- `6D. After auto-pipeline`
  Generated reports become readable in the dashboard's report viewer, and the
  pipeline screen becomes the browsing UI for tracked applications.
- `9D. After submission`
  Tracker status changes matter immediately here because the dashboard reads
  and updates `data/applications.md`.
- `10D. After outreach`
  Outreach notes recorded in the tracker become visible as application context
  during pipeline review.
- `11D. While waiting`
  The dashboard's progress screen is the UX layer for funnel health,
  conversion, and weekly activity.
- `12D. After response`
  The dashboard becomes the operational UI for moving roles through
  `Responded`, `Interview`, `Offer`, or `Rejected`.
- `D1. Boundary`
  The dashboard is a UI over the same repo data. It does not replace Codex
  modes, the tracker contract, or the main `1-12` checklist.

### Optional Export Path

- `L1. LaTeX / Overleaf CV export`
  Use `modes/latex.md` only when you explicitly want a `.tex` resume, local
  `pdflatex` compilation, or an Overleaf handoff.
- `L1a. When to use it`
  This is a side path off the normal PDF workflow, not a replacement for it.
  The default ATS-first path remains `modes/pdf.md` and `npm run pdf`.
- `L1b. What it does`
  It tailors the CV against a JD, fills `templates/cv-template.tex`, writes a
  `.tex` file to `output/`, and then validates and compiles it with
  `npm run latex` when `pdflatex` is available.
- `L1c. How to invoke it`
  Ask for it explicitly, for example:

  ```text
  Generate a LaTeX / Overleaf version of this tailored CV. Use modes/latex.md instead of the default PDF path, write the .tex file to output/, and compile it locally if pdflatex is available.
  ```

- `L1d. Where to look for command details`
  See `docs/SCRIPTS.md -> latex` for command behavior and `README.md` for the
  top-level operator boundary between the default PDF path and the optional
  LaTeX path.
