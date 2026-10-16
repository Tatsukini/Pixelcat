#!/usr/bin/env bash
# Launch the ThreeBody local backend (Python FastAPI).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"

# Prefer the project venv: the `python3` on PATH may be a non-functional stub
# (e.g. the Microsoft Store alias on Windows).
PY="$HERE/.venv/Scripts/python.exe"          # Windows layout
[ -x "$PY" ] || PY="$HERE/.venv/bin/python"  # POSIX layout
if [ ! -x "$PY" ]; then
  PY="$(command -v python3 || command -v python || true)"
fi
if [ -z "$PY" ]; then
  echo "No Python interpreter found. Run the one-click launcher (start.cmd) instead." >&2
  exit 1
fi

cd "$HERE/backend/python"
"$PY" -m pip install -q -r requirements.txt
exec "$PY" run.py
