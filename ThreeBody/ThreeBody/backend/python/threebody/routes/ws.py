"""WebSocket /ws: pushes simulation frames to connected browsers."""
from __future__ import annotations
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..state import SimState
from .. import engine as py_engine

log = logging.getLogger("threebody.ws")
router = APIRouter()

STATE: SimState = None  # type: ignore


def attach(state: SimState) -> None:
    global STATE
    STATE = state


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    loop = asyncio.get_event_loop()
    try:
        while True:
            if STATE.running:
                # Run the blocking integrator in a thread so the event loop stays alive.
                snap = await loop.run_in_executor(
                    None, _step_once
                )
                await ws.send_text(json.dumps(snap))
            else:
                await ws.send_text(json.dumps(STATE.snapshot()))
            await asyncio.sleep(1.0 / 60.0)
    except WebSocketDisconnect:
        log.info("frontend disconnected")
    except Exception as e:  # pragma: no cover
        log.exception("ws error: %s", e)


def _step_once():
    cfg = STATE.cfg
    for _ in range(cfg.substeps):
        STATE.positions, STATE.velocities = py_engine.integrate(
            STATE.positions, STATE.velocities, STATE.masses, cfg, 1
        )
        STATE.t += cfg.dt
    return STATE.snapshot()
