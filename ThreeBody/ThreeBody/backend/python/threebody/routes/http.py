"""HTTP routes: presets, config, start/stop, static frontend."""
from __future__ import annotations
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from ..config import PRESETS, SimConfig, Body, default_config, boundary_for
from ..state import SimState

router = APIRouter()

# Module-level singleton state (the app factory constructs it once).
STATE: SimState = None  # type: ignore


def attach(state: SimState) -> None:
    global STATE
    STATE = state


class StartBody(BaseModel):
    preset: str | None = None
    config: SimConfig | None = None


@router.get("/api/presets")
def presets():
    return {k: [b.__dict__ for b in v] for k, v in PRESETS.items()}


@router.get("/api/state")
def state():
    return STATE.snapshot()


@router.post("/api/start")
def start(body: StartBody | None = None):
    if body is not None:
        if body.config is not None:
            STATE.cfg = body.config
        elif body.preset and body.preset in PRESETS:
            STATE.cfg.bodies = PRESETS[body.preset]
            STATE.cfg.boundary_radius = boundary_for(PRESETS[body.preset])
    with STATE.lock:
        STATE.positions = [[b.x, b.y, b.z] for b in STATE.cfg.bodies]
        STATE.velocities = [[b.vx, b.vy, b.vz] for b in STATE.cfg.bodies]
        STATE.masses = [b.mass for b in STATE.cfg.bodies]
        STATE.t = 0.0
        STATE.running = True
    return {"ok": True}


@router.post("/api/stop")
def stop():
    with STATE.lock:
        STATE.running = False
    return {"ok": True}


@router.post("/api/config")
def update_config(cfg: SimConfig):
    STATE.cfg = cfg
    return {"ok": True}


# ---- static frontend ----
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "frontend")
)


@router.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@router.get("/src/{path:path}")
def static_src(path: str):
    p = os.path.join(FRONTEND_DIR, "src", path)
    if not os.path.isfile(p):
        raise HTTPException(404)
    return FileResponse(p)
