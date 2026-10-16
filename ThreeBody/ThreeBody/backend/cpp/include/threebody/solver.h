#pragma once
#include "body.h"
#include <vector>

namespace tb {

struct SolverConfig {
    double G = 1.0;
    double softening = 0.05;
    double dt = 0.005;
};

class NBodySolver {
public:
    explicit NBodySolver(SolverConfig cfg) : cfg_(cfg) {}

    void stepLeapfrog(std::vector<Body>& bodies) const;
    void stepRK4(std::vector<Body>& bodies) const;

private:
    std::vector<Vec3> accelerations(const std::vector<Body>& bodies) const;
    SolverConfig cfg_;
};

}  // namespace tb
