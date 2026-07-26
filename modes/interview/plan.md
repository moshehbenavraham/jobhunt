# Mode: interview/plan — Time-Blocked Interview Plan

Build a candidate-reviewed plan for one known role and round. This mode prepares
before an interview; it never provides hidden help during a live interview.

## Inputs

- company, role, tracker number, round type, and scheduled time
- evaluation report and archived JD
- `profile/cv.md`, `profile/article-digest.md` when present,
  `config/profile.yml`, and `modes/_profile.md`
- `interview-prep/story-bank.md` and prior session/question notes when present
- named panelists and the exact invite/source that identifies them
- prior compensation statements from `npm run salary:observations`

## Method

1. Separate verified strengths from gaps. Every gap needs a source reference;
   real prior practice/debrief gaps outrank inferred JD risks.
2. Calibrate depth to the round. A recruiter screen emphasizes narrative,
   logistics, and compensation consistency; practitioner/design rounds emphasize
   domain depth, trade-offs, and failure modes.
3. When two or more panelists are named, add structured Panel Intel: role,
   audience tag, decision weight, career signal, a tailored closing question,
   and source evidence. Unknown fields stay unknown.
4. Divide available time into single-topic blocks, always reserving final rest
   and a short pre-interview review. Do not manufacture company facts.
5. Build a version-1 `plan` input for:

   ```bash
   npm run interview:session -- --input=tmp/interview-plan.json
   ```

The tool writes paired Markdown/JSON artifacts under
`interview-prep/sessions/`. Story candidates are not appended unless the user
explicitly approves `--accept-story-updates`.

## Rules

- Never invent experience, metrics, questions, panel authority, or company
  culture.
- Label model inference as `inferred`; retain exact source excerpts and URLs.
- Generate in resolved `language.output`, independent of market heuristics.
- Stop before the live interview begins. Real-time covert assistance is out of
  scope.
