#include "threebody/solver.h"
#include <cmath>

namespace tb {

std::vector<Vec3> NBodySolver::accelerations(const std::vector<Body>& bodies) const {
    const std::size_t n = bodies.size();
    std::vector<Vec3> acc(n, Vec3{});
    const double soft2 = cfg_.softening * cfg_.softening;
    for (std::size_t i = 0; i < n; ++i) {
        for (std::size_t j = 0; j < n; ++j) {
            if (i == j) continue;
            const double dx = bodies[j].pos.x - bodies[i].pos.x;
            const double dy = bodies[j].pos.y - bodies[i].pos.y;
            const double dz = bodies[j].pos.z - bodies[i].pos.z;
            const double r2 = dx * dx + dy * dy + dz * dz + soft2;
            const double inv_r3 = 1.0 / (r2 * std::sqrt(r2));
            const double s = cfg_.G * bodies[j].mass * inv_r3;
            acc[i].x += s * dx;
            acc[i].y += s * dy;
            acc[i].z += s * dz;
        }
    }
    return acc;
}

void NBodySolver::stepLeapfrog(std::vector<Body>& bodies) const {
    auto acc = accelerations(bodies);
    const double dt = cfg_.dt;
    for (std::size_t i = 0; i < bodies.size(); ++i) {
        bodies[i].vel = bodies[i].vel + acc[i] * (0.5 * dt);
        bodies[i].pos = bodies[i].pos + bodies[i].vel * dt;
    }
    auto acc2 = accelerations(bodies);
    for (std::size_t i = 0; i < bodies.size(); ++i) {
        bodies[i].vel = bodies[i].vel + acc2[i] * (0.5 * dt);
    }
}

void NBodySolver::stepRK4(std::vector<Body>& bodies) const {
    // Minimal RK4 on the full state vector; vectorised for clarity.
    const double dt = cfg_.dt;
    auto k1v = accelerations(bodies);
    std::vector<Vec3> k1p(bodies.size());
    for (std::size_t i = 0; i < bodies.size(); ++i) k1p[i] = bodies[i].vel;

    std::vector<Body> mid = bodies;
    for (std::size_t i = 0; i < bodies.size(); ++i) {
        mid[i].pos = bodies[i].pos + k1p[i] * (0.5 * dt);
        mid[i].vel = bodies[i].vel + k1v[i] * (0.5 * dt);
    }
    auto k2v = accelerations(mid);
    std::vector<Vec3> k2p(bodies.size());
    for (std::size_t i = 0; i < bodies.size(); ++i) k2p[i] = mid[i].vel;

    for (std::size_t i = 0; i < bodies.size(); ++i) {
        mid[i].pos = bodies[i].pos + k2p[i] * (0.5 * dt);
        mid[i].vel = bodies[i].vel + k2v[i] * (0.5 * dt);
    }
    auto k3v = accelerations(mid);
    std::vector<Vec3> k3p(bodies.size());
    for (std::size_t i = 0; i < bodies.size(); ++i) k3p[i] = mid[i].vel;

    for (std::size_t i = 0; i < bodies.size(); ++i) {
        mid[i].pos = bodies[i].pos + k3p[i] * dt;
        mid[i].vel = bodies[i].vel + k3v[i] * dt;
    }
    auto k4v = accelerations(mid);
    std::vector<Vec3> k4p(bodies.size());
    for (std::size_t i = 0; i < bodies.size(); ++i) k4p[i] = mid[i].vel;

    for (std::size_t i = 0; i < bodies.size(); ++i) {
        bodies[i].pos = bodies[i].pos +
            (k1p[i] + k2p[i] * 2.0 + k3p[i] * 2.0 + k4p[i]) * (dt / 6.0);
        bodies[i].vel = bodies[i].vel +
            (k1v[i] + k2v[i] * 2.0 + k3v[i] * 2.0 + k4v[i]) * (dt / 6.0);
    }
}

}  // namespace tb
