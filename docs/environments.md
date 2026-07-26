# Environments

## Local

This repo is primarily used from a local checkout with:

- Codex CLI
- Node.js
- Playwright Chromium
- qpdf, Poppler, and MuPDF for finished-PDF validation
- Optional locally: Java + Apache Tika for another independent parser
- Optional Go for the dashboard

## Generated Artifacts

- `reports/` holds evaluation reports
- `output/` holds generated PDFs plus canonical JSON, HTML, and manifests
- `data/` holds tracker data
- `batch/tracker-additions/` holds pending TSV additions

## Notes

There is no separate deployment environment documented for the repo core workflows today. If that changes, document the new environment here.
