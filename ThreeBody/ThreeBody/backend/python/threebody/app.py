"""FastAPI application factory."""
from __future__ import annotations
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import default_config
from .state import SimState
from . import ffi
from .routes import http, ws

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    ffi.load()
    cfg = default_config()
    state = SimState(cfg)

    app = FastAPI(title="ThreeBody", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    http.attach(state)
    ws.attach(state)
    app.include_router(http.router)
    app.include_router(ws.router)

    @app.get("/api/health")
    def health():
        return {
            "ok": True,
            "cpp_core": ffi.has_cpp(),
            "rust_helper": ffi.has_rust(),
        }

    return app
