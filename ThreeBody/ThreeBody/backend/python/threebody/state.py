"""Thread-safe simulation state container."""
from __future__ import annotations
import threading
from typing import List, Dict, Any
from .config import SimConfig


class SimState:
    def __init__(self, cfg: SimConfig):
        self.lock = threading.RLock()
        self.cfg = cfg
        self.running = True
        self.t = 0.0
        # Flat arrays: positions and velocities as lists of [x,y,z]
        self.positions: List[List[float]] = [[b.x, b.y, b.z] for b in cfg.bodies]
        self.velocities: List[List[float]] = [[b.vx, b.vy, b.vz] for b in cfg.bodies]
        self.masses: List[float] = [b.mass for b in cfg.bodies]

    def snapshot(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "t": self.t,
                "positions": [list(p) for p in self.positions],
                "velocities": [list(v) for v in self.velocities],
                "masses": list(self.masses),
                "running": self.running,
                "config": self.cfg.to_dict(),
            }

    def update(self, positions, velocities, t: float):
        with self.lock:
            self.positions = positions
            self.velocities = velocities
            self.t = t
