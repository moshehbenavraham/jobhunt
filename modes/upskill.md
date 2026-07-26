# Mode: upskill — Exact-Source Skill-Gap Report

Use structured evidence to identify learning priorities. Do not infer semantic
aliases, add claims to the CV, or treat frequency alone as proof that a course
is worth buying.

Aggregate exact hard stops and soft gaps from valid Machine Summaries plus
structured JD skill-gap sidecars:

```bash
npm run upskill -- --json
npm run upskill
```

Analyze one local JD against the canonical CV:

```bash
npm run upskill -- --jd=jds/target-role.md --cv=profile/cv.md
```

The aggregate ranks unique exact requirements by source count, hard/must-have
mentions, and a transparent score-derived weight. It retains local report paths
and posting URLs, reports invalid sources instead of silently dropping them,
and writes user-owned Markdown/JSON artifacts under `reports/upskill/`.

Before recommending training, confirm the gap is repeated, relevant to target
roles, not already supported by verified evidence, and feasible within the
candidate's time/budget. Route a specific paid program to `modes/training.md`.
