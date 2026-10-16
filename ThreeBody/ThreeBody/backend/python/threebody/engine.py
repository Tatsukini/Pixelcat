"""Pure-Python N-body integrator (fallback when C++ lib is absent).

Supports leapfrog (symplectic) and RK4. Uses Plummer softening to
avoid singularities during close encounters.
"""
from __future__ import annotations
import math
from typing import List, Tuple


def _accelerations(positions: List[List[float]], masses: List[float],
                   G: float, soft: float) -> List[List[float]]:
    n = len(positions)
    acc = [[0.0, 0.0, 0.0] for _ in range(n)]
    for i in range(n):
        xi, yi, zi = positions[i]
        for j in range(n):
            if i == j:
                continue
            dx = positions[j][0] - xi
            dy = positions[j][1] - yi
            dz = positions[j][2] - zi
            r2 = dx * dx + dy * dy + dz * dz + soft * soft
            inv_r3 = 1.0 / (r2 * math.sqrt(r2))
            s = G * masses[j] * inv_r3
            acc[i][0] += s * dx
            acc[i][1] += s * dy
            acc[i][2] += s * dz
    return acc


def step_leapfrog(positions, velocities, masses, G, soft, dt) -> Tuple[list, list]:
    acc = _accelerations(positions, masses, G, soft)
    # kick-drift-kick
    for i in range(len(positions)):
        velocities[i][0] += 0.5 * dt * acc[i][0]
        velocities[i][1] += 0.5 * dt * acc[i][1]
        velocities[i][2] += 0.5 * dt * acc[i][2]
    for i in range(len(positions)):
        positions[i][0] += dt * velocities[i][0]
        positions[i][1] += dt * velocities[i][1]
        positions[i][2] += dt * velocities[i][2]
    acc2 = _accelerations(positions, masses, G, soft)
    for i in range(len(positions)):
        velocities[i][0] += 0.5 * dt * acc2[i][0]
        velocities[i][1] += 0.5 * dt * acc2[i][1]
        velocities[i][2] += 0.5 * dt * acc2[i][2]
    return positions, velocities


def step_rk4(positions, velocities, masses, G, soft, dt) -> Tuple[list, list]:
    def derivs(p, v):
        return v, _accelerations(p, masses, G, soft)

    def add(a, b, k):
        return [[a[i][d] + k * b[i][d] for d in range(3)] for i in range(len(a))]

    k1p, k1v = derivs(positions, velocities)
    k2p, k2v = derivs(add(positions, k1p, dt / 2), add(velocities, k1v, dt / 2))
    k3p, k3v = derivs(add(positions, k2p, dt / 2), add(velocities, k2v, dt / 2))
    k4p, k4v = derivs(add(positions, k3p, dt), add(velocities, k3v, dt))

    new_p = [[positions[i][d] + dt / 6 * (k1p[i][d] + 2 * k2p[i][d] + 2 * k3p[i][d] + k4p[i][d])
              for d in range(3)] for i in range(len(positions))]
    new_v = [[velocities[i][d] + dt / 6 * (k1v[i][d] + 2 * k2v[i][d] + 2 * k3v[i][d] + k4v[i][d])
              for d in range(3)] for i in range(len(velocities))]
    return new_p, new_v


def reflect_at_boundary(positions, velocities, radius: float) -> None:
    """Keep bodies inside a sphere: clamp to the surface and reflect the radial
    velocity component. Mutates in place. `radius <= 0` disables the boundary."""
    if radius <= 0.0:
        return
    r2 = radius * radius
    for p, v in zip(positions, velocities):
        d2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2]
        if d2 <= r2 or d2 == 0.0:
            continue
        d = math.sqrt(d2)
        nx, ny, nz = p[0] / d, p[1] / d, p[2] / d
        p[0], p[1], p[2] = nx * radius, ny * radius, nz * radius
        vn = v[0] * nx + v[1] * ny + v[2] * nz
        if vn > 0.0:
            v[0] -= 2.0 * vn * nx
            v[1] -= 2.0 * vn * ny
            v[2] -= 2.0 * vn * nz


def integrate(positions, velocities, masses, cfg, steps: int):
    G = cfg.gravity_constant
    soft = cfg.softening
    dt = cfg.dt
    fn = step_rk4 if cfg.integrator == "rk4" else step_leapfrog
    for _ in range(steps):
        positions, velocities = fn(positions, velocities, masses, G, soft, dt)
        reflect_at_boundary(positions, velocities, cfg.boundary_radius)
    return positions, velocities
