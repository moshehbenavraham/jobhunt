# Dashboard

This directory contains the Go-based terminal dashboard for browsing and updating the job-search pipeline.

- `main.go` is the app entry point.
- `go.mod` and `go.sum` define the Go module dependencies.

## Launch

Preferred launcher from the repo root:

```bash
npm run dashboard
npm run dashboard -- --lang de
```

Equivalent manual path:

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```

`npm run dashboard` wraps `./scripts/ux.sh`, which builds the binary in
`dashboard/` and defaults `--path` to the repo root. Additional flags are
passed through to the dashboard binary.

`--lang` (or `JOBHUNT_LANG`) accepts `en`, `de`, `fr`, and `ja`. It localizes
dashboard chrome only; canonical tracker statuses, paths, and report content
remain unchanged. Search with `/` across company, role, location, source,
compensation, contact, status, notes, URL, and report metadata. `Ctrl+L` clears
the query, `s` changes sort, and `v` switches grouped/flat views.

The dashboard uses the same header aliases, tracker lock, atomic replacement,
status-transition log, contained report resolver, and PDF-manifest freshness
contract as the Node workflows. It opens only absolute `http(s)` URLs through
argument-safe OS commands.
