# Mode: interview/debrief — Evidence-Backed Interview Debrief

Debrief a completed interview from the candidate's notes or transcript. Do not
infer that a signal occurred unless it is present in the supplied material.

## Method

1. Save the transcript/notes under `interview-prep/sessions/` as user-owned
   data. Preserve speaker labels where available.
2. Extract exact transcript excerpts for what went well, gaps, unanswered
   questions, and follow-ups.
3. Review five risk dimensions separately: process, culture, management, scope,
   and compensation. Each is `clear`, `watch`, `reconsider`, or `unknown`, with
   severity, evidence, and candidate review state.
4. Capture panel intelligence only from the invite, direct statements, or
   attributed sources. Do not infer decision authority from title alone.
5. Identify STAR+R story candidates without automatically editing the story
   bank.
6. Build a version-1 `debrief` input and run:

   ```bash
   npm run interview:session -- --input=tmp/interview-debrief.json
   ```

The tool verifies every transcript evidence excerpt exactly, hashes the local
source, and writes paired Markdown/JSON artifacts. Use
`--accept-story-updates` only after the candidate approves the proposed
stories.

Never quote private interviewer names or transcript content into committed
system files.
