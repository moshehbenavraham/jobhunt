# Dashboard

This directory contains the Go-based terminal dashboard for browsing and
updating the job-search pipeline as a secondary surface after the app-owned
operator home.

- `main.go` is the app entry point.
- `go.mod` and `go.sum` define the Go module dependencies.

## Launch

Secondary launcher from the repo root:

```bash
npm run dashboard
```

Equivalent manual path:

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```

`npm run dashboard` wraps `./scripts/ux.sh`, which builds the binary in
`dashboard/` and defaults `--path` to the repo root. Additional flags are
passed through to the dashboard binary. Use it when you intentionally want the
terminal parity path rather than the default app-owned landing surface.
