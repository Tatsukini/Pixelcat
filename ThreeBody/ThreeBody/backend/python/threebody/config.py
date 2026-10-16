"""Simulation configuration and presets.

All tunables the frontend exposes live here so the C++/Rust/Java/C#
modules can share the same vocabulary.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any
import math


@dataclass
class Body:
    name: str
    mass: float
    x: float
    y: float
    z: float
    vx: float
    vy: float
    vz: float
    radius: float = 1.0
    color: str = "#ffffff"


@dataclass
class SimConfig:
    """Global simulation tunables."""
    gravity_constant: float = 1.0          # G (scaled units)
    softening: float = 0.05                # Plummer softening to avoid singularities
    dt: float = 0.005                      # integration step
    integrator: str = "leapfrog"           # leapfrog | rk4
    substeps: int = 4                      # physics substeps per pushed frame
    bodies: List[Body] = field(default_factory=list)
    # Render-side knobs (echoed to the client)
    particle_count: int = 4000
    gaussian_blur: float = 0.6             # 0..1
    motion_blur: float = 0.35             # 0..1
    volumetric_light: float = 0.55        # 0..1
    volumetric_fog: float = 0.4            # 0..1
    trail_length: float = 0.6             # 0..1
    boundary_radius: float = 6.0          # bodies bounce off a sphere of this radius (0 = off)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _figure_eight() -> List[Body]:
    """Classic Chenciner–Montgomery figure-eight solution (scaled units)."""
    m = 1.0
    return [
        Body("A", m, 0.97000436, -0.24308753, 0.0,
             0.4662036850, 0.4323657300, 0.0, 1.2, "#ff6b6b"),
        Body("B", m, -0.97000436, 0.24308753, 0.0,
             0.4662036850, 0.4323657300, 0.0, 1.2, "#4ecdc4"),
        Body("C", m, 0.0, 0.0, 0.0,
             -0.93240737, -0.86473146, 0.0, 1.2, "#ffe66d"),
    ]


def _lagrange_l1() -> List[Body]:
    return [
        Body("Sun", 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 3.0, "#ffd166"),
        Body("Planet", 1.0, 10.0, 0.0, 0.0, 0.0, math.sqrt(100.0 / 10.0), 0.0, 1.0, "#4cc9f0"),
        Body("Moon", 0.01, 11.0, 0.0, 0.0, -0.02, math.sqrt(100.0 / 10.0) * 1.05, 0.0, 0.4, "#f8f9fa"),
    ]


def _chaos() -> List[Body]:
    return [
        Body("P1", 5.0, -6.0, 0.0, 0.0, 0.0, 0.4, 0.0, 1.5, "#ef476f"),
        Body("P2", 5.0, 6.0, 0.0, 0.0, 0.0, -0.4, 0.0, 1.5, "#06d6a0"),
        Body("P3", 2.0, 0.0, 5.0, 0.5, -0.3, 0.0, 0.2, 1.0, "#118ab2"),
    ]


PRESETS: Dict[str, List[Body]] = {
    "figure_eight": _figure_eight(),
    "lagrange_l1": _lagrange_l1(),
    "chaos_dance": _chaos(),
}


def boundary_for(bodies: List[Body], factor: float = 2.0, floor: float = 1.0) -> float:
    """Boundary radius that comfortably contains the given bodies' starting extent."""
    extent = max((math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z) for b in bodies), default=0.0)
    return max(floor, factor * extent)


def default_config() -> SimConfig:
    bodies = _figure_eight()
    return SimConfig(bodies=bodies, boundary_radius=boundary_for(bodies))
