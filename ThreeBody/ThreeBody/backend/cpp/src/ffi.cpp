// extern "C" ABI consumed by Python ctypes.
// Layout: bodies are passed as flat double arrays [x,y,z,vx,vy,vz,mass] * n.
#include "threebody/solver.h"
#include <cstddef>
#include <cstring>

extern "C" {

// Step `steps` leapfrog iterations.
// pos: float[3n] (double)
// vel: float[3n] (double)
// mass: double[n]
void tb_step_leapfrog(double* pos, double* vel, const double* mass,
                     std::size_t n, double G, double soft, double dt,
                     std::size_t steps) {
    tb::SolverConfig cfg{G, soft, dt};
    tb::NBodySolver solver(cfg);
    std::vector<tb::Body> bodies(n);
    for (std::size_t i = 0; i < n; ++i) {
        bodies[i].pos = {pos[3*i], pos[3*i+1], pos[3*i+2]};
        bodies[i].vel = {vel[3*i], vel[3*i+1], vel[3*i+2]};
        bodies[i].mass = mass[i];
    }
    for (std::size_t s = 0; s < steps; ++s) solver.stepLeapfrog(bodies);
    for (std::size_t i = 0; i < n; ++i) {
        pos[3*i] = bodies[i].pos.x;
        pos[3*i+1] = bodies[i].pos.y;
        pos[3*i+2] = bodies[i].pos.z;
        vel[3*i] = bodies[i].vel.x;
        vel[3*i+1] = bodies[i].vel.y;
        vel[3*i+2] = bodies[i].vel.z;
    }
}

const char* tb_version() { return "1.0.0"; }

}  // extern "C"
