# Mode: interview/practice — One-Question-at-a-Time Practice

Run a mock interview, one question at a time. This is an explicit practice
session, not live-interview assistance.

## Preflight

Read the role report/JD, profile proof points, story bank, and prior session
gaps. If role-specific material is absent, tell the candidate that questions
will be generic and ask whether to proceed.

## Protocol

1. State the round/persona and ask one natural question.
2. Wait for the full answer. Ask at most one realistic follow-up before
   feedback.
3. Record the exact answer; do not rewrite it as if the candidate said
   something stronger.
4. Give concise feedback:
   - what landed
   - what to sharpen
   - competency
   - `strong`, `solid`, or `gap`
   - claim review: verified, candidate-confirmed, needs evidence, or no claims
5. Never coach an unsupported number or experience claim. Check the CV,
   article digest, story bank, and retracted claims first.
6. At the end, create a version-1 `practice` snapshot with:

   ```bash
   npm run interview:session -- --input=tmp/interview-practice.json
   ```

Candidate-approved story candidates may be appended only with the explicit
`--accept-story-updates` flag.
