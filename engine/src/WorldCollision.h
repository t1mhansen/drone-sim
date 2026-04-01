#pragma once
#include "DroneState.h"
#include <vector>
#include <cmath>
#include <cstdint>

struct AABB {
    double minX, maxX;
    double minY, maxY;
    double height; // 0 to height
};

class WorldCollision {
public:
    WorldCollision();
    void resolveCollisions(DroneState& state);

private:
    std::vector<AABB> buildings;
    void generateBuildings();

    // Park-Miller PRNG (matches JS: s = s * 16807 % 2147483647)
    int64_t seed;
    double nextRandom() {
        seed = (seed * 16807) % 2147483647;
        return static_cast<double>(seed - 1) / 2147483646.0;
    }
};
