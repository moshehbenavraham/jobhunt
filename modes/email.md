# Mode: email — Formal application email draft

Create a draft email for a direct HR application, recruiter application,
referral request, cold application, confirmed-time no-show, or ATS failure.
This mode is draft-only: never send, submit, click, accept terms, or claim that
any message was sent.

Read `config/profile.yml`, `modes/_profile.md`, `profile/cv.md`, the matching
evaluation report, and any user-provided facts. Build a versioned input for
`scripts/application-email.mjs`; every paragraph must cite exact evidence from
those source files. Use the resolved `language.output` and the user's voice
guidance.

The artifact must include:

- subject, greeting, concise body, and sign-off
- profile-derived contact block
- validated attachment checklist
- evidence list
- human-review and no-send declarations

Run:

```bash
node scripts/application-email.mjs --input=/tmp/application-email.json
```

Return the draft and manifest paths. The user reviews, attaches files, and
sends manually.
