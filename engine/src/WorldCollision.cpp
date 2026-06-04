#include "WorldCollision.h"
#include <cmath>
#include <algorithm>

namespace {
    // --- Damage tuning -------------------------------------------------------
    // Impacts are scored on "ram" = (impactSpeed - threshold) * mass, which is
    // forgiving to tune and reads naturally: heavy/fast things hit harder.
    constexpr double MIN_IMPACT_SPEED  = 3.0;   // below this a hit is just a bump
    constexpr double STRUCT_DAMAGE_K   = 1.0;   // ram -> building damage
    constexpr double DRONE_SAFE_SPEED  = 5.0;   // impact speed a frame shrugs off
    constexpr double DRONE_DAMAGE_K    = 3.0;   // (speed - safe) -> drone damage
    constexpr double KAMIKAZE_ARM_SPEED = 3.0;  // min speed for a munition to detonate
    constexpr double BREAKTHROUGH_KEEP = 0.45;  // velocity retained smashing through

    double buildingMaxHealth(double w, double d, double h) {
        // Bigger footprint and taller towers are sturdier.
        return 40.0 + (w * d) / 20.0 + h * 1.5;
    }
}

WorldCollision::WorldCollision() : seed(world::SEED) {
    generateBuildings();
}

void WorldCollision::generateBuildings() {
    using namespace world;
    for (int bx = -GRID_RANGE; bx < GRID_RANGE; bx++) {
        for (int bz = -GRID_RANGE; bz < GRID_RANGE; bz++) {
            double blockCenterX = bx * (BLOCK_SIZE + ROAD_WIDTH);
            double blockCenterZ = bz * (BLOCK_SIZE + ROAD_WIDTH);

            int numBuildings = 1 + static_cast<int>(std::floor(nextRandom() * 3));
            for (int i = 0; i < numBuildings; i++) {
                double w = 12.0 + nextRandom() * 28.0;
                double d = 12.0 + nextRandom() * 28.0;
                double h = 12.0 + nextRandom() * 65.0;
                double offsetX = (nextRandom() - 0.5) * (BLOCK_SIZE - w) * 0.8;
                double offsetZ = (nextRandom() - 0.5) * (BLOCK_SIZE - d) * 0.8;

                double cx = blockCenterX + offsetX;
                double cz = blockCenterZ + offsetZ;

                // In Three.js: building at [cx, h/2, cz] with dims [w, h, d]
                // In drone state coords: x=cx, y=cz (Three.js Z = drone Y)
                buildings.push_back({
                    cx - w / 2.0, cx + w / 2.0,   // minX, maxX
                    cz - d / 2.0, cz + d / 2.0,   // minY, maxY
                    h,                            // height (0 to h)
                    buildingMaxHealth(w, d, h),   // health
                    false                         // destroyed
                });

                // Consume the color randoms to stay in sync with JS
                nextRandom(); // building color
                nextRandom(); // window color
            }
        }
    }
}

void WorldCollision::reset() {
    for (auto& b : buildings) {
        b.destroyed = false;
        b.health = buildingMaxHealth(b.maxX - b.minX, b.maxY - b.minY, b.height);
    }
}

std::vector<WorldEvent> WorldCollision::resolveCollisions(DroneState& state, const DroneConfig& config) {
    std::vector<WorldEvent> events;

    // A destroyed drone is an inert wreck — no further collisions until respawn.
    if (state.health <= 0.0) {
        return events;
    }

    const bool kamikaze = config.isKamikaze != 0;

    auto destroyDrone = [&](double x, double y, double z) {
        state.health = 0.0;
        state.vx = state.vy = state.vz = 0.0;
        events.push_back({WorldEventType::DroneDestroyed, -1, x, y, z});
    };

    // --- Ground collision ---
    if (state.z < 0.0) {
        double impactSpeed = std::fabs(state.vz);
        state.z = 0.0;
        state.vz = 0.0;
        if (config.type == DroneType::FIXED_WING) {
            state.vx = 0.0;
            state.vy = 0.0;
        }
        if (kamikaze && impactSpeed > KAMIKAZE_ARM_SPEED) {
            destroyDrone(state.x, state.y, 0.0);
            return events;
        }
        double dmg = std::max(0.0, impactSpeed - DRONE_SAFE_SPEED) * DRONE_DAMAGE_K;
        state.health = std::max(0.0, state.health - dmg);
        if (state.health <= 0.0) {
            destroyDrone(state.x, state.y, 0.0);
            return events;
        }
    }

    // --- Building collisions ---
    for (size_t bi = 0; bi < buildings.size(); bi++) {
        Building& b = buildings[bi];
        if (b.destroyed) continue;

        bool inside = state.x > b.minX && state.x < b.maxX &&
                      state.y > b.minY && state.y < b.maxY &&
                      state.z < b.height && state.z >= 0.0;
        if (!inside) continue;

        // Minimum-penetration axis to push out (0=−X,1=+X,2=−Y,3=+Y,4=top).
        double penLeft  = state.x - b.minX;
        double penRight = b.maxX - state.x;
        double penFront = state.y - b.minY;
        double penBack  = b.maxY - state.y;
        double penTop   = b.height - state.z;

        double minPen = penLeft;
        int axis = 0;
        if (penRight < minPen) { minPen = penRight; axis = 1; }
        if (penFront < minPen) { minPen = penFront; axis = 2; }
        if (penBack  < minPen) { minPen = penBack;  axis = 3; }
        if (penTop   < minPen) { minPen = penTop;   axis = 4; }

        // Speed into the surface along the resolution axis.
        double impactSpeed = (axis == 4) ? std::fabs(state.vz)
                           : (axis < 2)  ? std::fabs(state.vx)
                                         : std::fabs(state.vy);

        // Kamikaze: any armed contact detonates — building and drone both gone.
        if (kamikaze && impactSpeed > KAMIKAZE_ARM_SPEED) {
            b.destroyed = true;
            b.health = 0.0;
            events.push_back({WorldEventType::BuildingDestroyed, (int)bi, state.x, state.y, state.z});
            destroyDrone(state.x, state.y, state.z);
            return events;
        }

        double ram = std::max(0.0, impactSpeed - MIN_IMPACT_SPEED) * config.mass;
        b.health -= ram * STRUCT_DAMAGE_K;

        // Drone always takes its share of a hard hit.
        double droneDmg = std::max(0.0, impactSpeed - DRONE_SAFE_SPEED) * DRONE_DAMAGE_K;
        state.health = std::max(0.0, state.health - droneDmg);

        if (b.health <= 0.0) {
            // Building gives way — smash through, bleeding off most of the speed.
            b.destroyed = true;
            events.push_back({WorldEventType::BuildingDestroyed, (int)bi, state.x, state.y, state.z});
            state.vx *= BREAKTHROUGH_KEEP;
            state.vy *= BREAKTHROUGH_KEEP;
            state.vz *= BREAKTHROUGH_KEEP;
        } else {
            // Building holds — push the drone back out and kill inward velocity.
            switch (axis) {
                case 0: state.x = b.minX; if (state.vx > 0) state.vx = 0; break;
                case 1: state.x = b.maxX; if (state.vx < 0) state.vx = 0; break;
                case 2: state.y = b.minY; if (state.vy > 0) state.vy = 0; break;
                case 3: state.y = b.maxY; if (state.vy < 0) state.vy = 0; break;
                case 4: state.z = b.height; if (state.vz < 0) state.vz = 0; break;
            }
        }

        if (state.health <= 0.0) {
            destroyDrone(state.x, state.y, state.z);
            return events;
        }
    }

    return events;
}
