#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--json" && $# -gt 0 ]]; then
  echo "Usage: $0 --json" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REPO_ROOT="$repo_root" node --input-type=module << 'NODE'
import fs from "fs";
import path from "path";

const repoRoot = process.env.REPO_ROOT;
const statePath = path.join(repoRoot, ".spec_system", "state.json");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const currentSession = state.current_session ?? null;
const sessionDir = currentSession
  ? path.join(repoRoot, ".spec_system", "specs", currentSession)
  : null;

let currentSessionFiles = [];
let currentSessionDirExists = false;
if (sessionDir && fs.existsSync(sessionDir)) {
  currentSessionDirExists = true;
  currentSessionFiles = fs
    .readdirSync(sessionDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

const output = {
  current_session: currentSession,
  current_session_dir_exists: currentSessionDirExists,
  current_session_files: currentSessionFiles,
  monorepo: Boolean(state.monorepo),
  packages: [],
  active_package: null,
};

console.log(JSON.stringify(output));
NODE
