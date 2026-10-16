# ThreeBody — Polyglot Three-Body Problem Simulator

A deliberately bloated, six-language (Python / C++ / Rust / JS / C# / Java)
three-body N-body simulation with a local backend and a browser frontend.

Features:
- Leapfrog / RK4 N-body integrator with Plummer softening (C++ core, Python fallback)
- Spherical boundary: bodies are reflected at the edge instead of flying off-screen
- WebSocket real-time telemetry push
- WebGL frontend: GPU particles, Gaussian blur, motion blur,
  volumetric lighting (ray-marched god rays), volumetric fog
- HUD overlay: grid + X/Y/Z axes and a top-left coordinate readout for all three
  bodies, each switchable to absolute / pixel / centimetre units
- Orbit camera: slider-controlled and mouse-driven (left-drag to rotate, wheel to
  zoom)
- Collapsible control panel (button at the panel's top-right)
- Many customizable particle/body presets and parameters
- No memory leaks: RAII in C++, ownership in Rust, GC in Python/C#/Java,
  explicit GPU resource disposal in JS

## Requirements

**Backend — Python 3.10 or newer** (verified on CPython 3.14, Windows x64).
Install the dependencies from `backend/python/requirements.txt`:

| Package | Constraint | Purpose |
| --- | --- | --- |
| `fastapi` | `>=0.115` | HTTP API + static file serving |
| `uvicorn[standard]` | `>=0.30` | ASGI server (uvicorn's `standard` extra pulls in `httptools` and `watchfiles`) |
| `websockets` | `>=12.0` | WebSocket transport for telemetry |
| `pydantic` | `>=2.9` | request/response models |
| `numpy` | `>=1.26` | declared in `requirements.txt` but not imported by the Python engine, which is pure stdlib |

The constraints are lower bounds rather than hard pins, so pip can pick a release
with a wheel for your interpreter. The previous exact pins predate Python 3.13 and
fail to install there — `numpy==1.26.4` has no matching wheel, so pip falls back to
compiling from source and needs a full C toolchain.

**Frontend — no toolchain needed.** Plain ES modules plus WebGL and
`canvas2d`, served by the backend itself. Any current Chrome, Edge or Firefox
works. There is no `npm install` and no build step.

**Native accelerators are optional.** The C++ / Rust / Java / C# modules in
`backend/` only speed up the integrator; without them the pure-Python engine in
`backend/python/threebody/engine.py` is used. Building them requires `cmake`,
`cargo`, `mvn` and the `dotnet` SDK, none of which are needed for the quick start.

## Quick start (one click)

Double-click **`start.cmd`** in the project folder.

It locates the project, creates `.venv` and installs the dependencies on first
run, starts the backend on <http://127.0.0.1:8000/>, and opens your browser.
Press `Ctrl+C` in the window to stop the server. If port 8000 is already
serving, it just opens the browser instead of starting a second instance.

## Quick start (manual)

```bash
cd ThreeBody
bash scripts/run.sh
# then open http://127.0.0.1:8000/
```

`scripts/run.sh` prefers the project's `.venv` interpreter and falls back to
`python3` on `PATH`. To set the venv up yourself:

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/python/requirements.txt   # Windows
.venv/bin/python         -m pip install -r backend/python/requirements.txt   # macOS / Linux

cd backend/python
../../.venv/Scripts/python.exe run.py    # Windows
../../.venv/bin/python         run.py    # macOS / Linux
```

The backend serves both the REST/WebSocket API and the frontend, so the single
URL above is all you need.

To build the native accelerators (optional):

```bash
bash scripts/build.sh
```

See docs/ARCHITECTURE.md for the full map.

## Troubleshooting

- **`python3` exits with code 49 / "Python was not found"** — this is the
  Microsoft Store alias stub, not a real interpreter. Use `start.cmd`, or the
  project `.venv` directly.
- **`pip install` tries to compile numpy from source** — you are on a Python
  version newer than the pinned wheel. Check that `requirements.txt` still has
  lower bounds rather than exact pins.
- **Blank white viewport** — the WebGL context failed or the shaders were served
  from a stale cache. Hard-reload (Ctrl+Shift+R) and check the browser console.
