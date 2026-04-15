# Residual Legacy References

This inventory tracks non-blocking legacy references that remain after the
scoped Session 03 metadata cleanup. Each entry should identify the file,
reason it is deferred, and the phase that should own the follow-up work.

## Deferred References

| File | Reference | Why Deferred | Owning Phase |
|------|-----------|--------------|--------------|
| `README.md` | Claude-first badges, `claude` quick-start, and batch copy still describe the legacy runtime | Public onboarding and entrypoint positioning belong to the later docs refresh, not the blocking metadata path cleanup in Session 03 | Phase 01 |
| `docs/SETUP.md` | Prerequisites and startup flow still require Claude Code and `claude` | Setup guide refresh belongs to the Phase 01 public docs rewrite | Phase 01 |
| `docs/CONTRIBUTING.md` | Contributor guidance still says the project is built with Claude Code | Contributor-facing docs cleanup is non-blocking and should move with the broader Codex-primary docs pass | Phase 01 |
| `docs/SUPPORT.md` | Support guidance still asks users to report which CLI they use, including Claude Code and OpenCode | Support doc language is non-blocking metadata and should align during the Phase 01 docs pass | Phase 01 |
| `docs/CUSTOMIZATION.md` | Hook examples still point at `.claude/settings.json` | Runtime customization guidance needs a broader docs decision and is not required for the Session 03 metadata surface | Phase 01 |
| `docs/LEGAL_DISCLAIMER.md` | AI CLI examples still enumerate Claude Code first | Legal and public copy updates are out of scope for this metadata-only session | Phase 01 |
| `modes/batch.md` | Batch conductor and worker flow still uses `claude` and `claude -p` examples | Batch runtime migration is explicitly deferred to the batch workstream after Phase 00 | Phase 02 |
| `batch/README-batch.md` | Batch docs still describe `claude -p` workers and options | Batch worker runtime migration belongs to the Phase 02 batch execution changes | Phase 02 |
| `batch/batch-runner.sh` | Worker launch and prerequisite checks still require the `claude` CLI | Runtime execution changes belong to the later batch migration phase, not Session 03 metadata cleanup | Phase 02 |
| `docs/ARCHITECTURE.md` | Architecture diagrams and batch descriptions still model `claude -p` workers | Architecture docs should update after the Phase 02 batch runtime changes land | Phase 02 |

## Notes

- Session 03 owns blocking metadata and system-doc path fixes only.
- Public docs refresh and broad runtime language cleanup stay out of scope.
- The entries above are intentionally limited to non-blocking references found
  during the Session 03 scoped scan across `README.md`, `docs/`, `batch/`,
  and `modes/batch.md`.
