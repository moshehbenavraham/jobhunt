# Scripts

This directory contains the project's utility scripts.

- Node.js scripts handle setup checks, tracker maintenance, portal scanning,
  SQLite backups, PDF generation, liveness checks, updates, and verification.
- Shell helpers handle repo-local workflows such as scheduled scans and the
  dashboard launcher.
- Most operational commands exposed through `package.json` resolve here, and
  some direct entry points such as `./scripts/ux.sh` do too.
