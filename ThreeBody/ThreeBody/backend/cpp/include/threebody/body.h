#pragma once
#include "vector3.h"

namespace tb {

struct Body {
    Vec3 pos;
    Vec3 vel;
    double mass = 1.0;
    double radius = 1.0;
};

}  // namespace tb
