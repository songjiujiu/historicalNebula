#!/usr/bin/env bash
set -Eeuo pipefail

# Jenkins runs this from a clean archive of the server's checked-out revision.
cd "${WORKSPACE:?WORKSPACE is required}"

printf 'Node: '; node --version
printf 'npm: '; npm --version
printf 'Python: '; python3 --version

npm ci --no-audit --no-fund
npm test -- --maxWorkers=1 --no-file-parallelism
npm run build

python3 -m venv .venv
.venv/bin/python -m pip install --disable-pip-version-check -r backend/requirements-dev.txt
PYTHONPATH=. .venv/bin/python -m pytest -q backend/tests

revision="${BUILD_REVISION:-$(git rev-parse --short=12 HEAD 2>/dev/null || printf unknown)}"
archive="historical-nebula-${revision}.tar.gz"
tar -C dist -czf "$archive" .
printf 'Build artifact: %s\n' "$archive"
