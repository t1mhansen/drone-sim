#pragma once
#include "DroneState.h"
#include "DroneConfig.h"
#include <vector>
#include <cstdint>

// ---------------------------------------------------------------------------
// Procedural city layout.
//
// The building grid is generated independently here (for collision) and in the
// frontend's UrbanEnvironment.tsx (for rendering). Both walk the SAME nested
// loop in the SAME order with the SAME Park-Miller PRNG seeded at 42, so the
// Nth building produced here is the Nth building drawn there. That shared index
// is the building's stable id, used to sync destruction across the wire.
//
// If you change ANY constant or the order of nextRandom() calls, change it in
// BOTH places or collision and visuals will drift apart.
// ---------------------------------------------------------------------------
namespace world {
    constexpr int    BLOCK_SIZE  = 60;
    constexpr int    ROAD_WIDTH  = 18;
    constexpr int    GRID_RANGE  = 4;
    constexpr int64_t SEED       = 42;
}

struct Building {
    double minX, maxX;
    double minY, maxY;
    double height;      // occupies z in [0, height]
    double health;      // structural integrity; <= 0 means destroyed
    bool   destroyed;
};

enum class WorldEventType : int32_t {
    BuildingDestroyed = 1,
    DroneDestroyed    = 2,
    WorldReset        = 3,
};

struct WorldEvent {
    WorldEventType type;
    int32_t index;       // building index for BuildingDestroyed, else -1
    double x, y, z;      // impact / effect location (drone-space)
};

class WorldCollision {
public:
    WorldCollision();

    // Resolve ground + building collisions for this tick, applying damage to
    // both the drone (state.health) and the buildings. Returns any destruction
    // events that occurred so the caller can broadcast them.
    std::vector<WorldEvent> resolveCollisions(DroneState& state, const DroneConfig& config);

    // Restore every building to full health (full-world reset).
    void reset();

    const std::vector<Building>& getBuildings() const { return buildings; }

private:
    std::vector<Building> buildings;
    void generateBuildings();

    // Park-Miller PRNG (matches JS: s = s * 16807 % 2147483647)
    int64_t seed;
    double nextRandom() {
        seed = (seed * 16807) % 2147483647;
        return static_cast<double>(seed - 1) / 2147483646.0;
    }
};
